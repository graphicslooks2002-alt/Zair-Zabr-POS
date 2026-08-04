const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { isNonNegativeNumber } = require("../utils/validate");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Aliases map snake_case columns back to the camelCase / _id shape the frontend expects.
const ORDER_SELECT =
  "_id:id, customerDetails:customer_details, orderStatus:order_status, orderType:order_type, orderDate:order_date, bills, items, paymentMethod:payment_method, paymentStatus:payment_status, paymentData:payment_data, discountAmount:discount_amount, notes, sessionId:session_id, table:tables!orders_table_id_fkey(_id:id, tableNo:table_no)";

const addOrder = async (req, res, next) => {
  try {
    const {
      customerDetails,
      orderType,
      bills,
      items,
      paymentMethod,
      paymentData,
      paymentStatus,
      discount,
      notes,
      table,
    } = req.body;

    // Validate the essentials.
    if (!customerDetails || !customerDetails.name) {
      return next(createHttpError(400, "Customer name is required."));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return next(createHttpError(400, "Please select a product before placing the order."));
    }
    if (!bills || !isNonNegativeNumber(bills.totalWithTax)) {
      return next(createHttpError(400, "Something's wrong with the order total. Please review and try again."));
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_details: customerDetails,
        order_status: null, // status workflow removed
        order_type: orderType || "Take Away",
        bills,
        items: items || [],
        payment_method: paymentMethod || null,
        payment_data: paymentData || null,
        payment_status: paymentStatus === "Pending" ? "Pending" : "Paid",
        discount_amount: discount?.amount || 0,
        notes: notes || null,
        table_id: table || null,
      })
      .select(ORDER_SELECT)
      .single();

    if (error) return next(createHttpError(500, error.message));

    // If unpaid, record it in the pending payments tracker.
    if (paymentStatus === "Pending") {
      await supabase.from("pending_payments").insert({
        order_id: data._id,
        customer_name: customerDetails?.name || "Walk-in Customer",
        phone: customerDetails?.phone || "N/A",
        items: items || [],
        total_amount: bills?.totalWithTax || 0,
        pending_amount: bills?.totalWithTax || 0,
        order_date: data.orderDate,
        payment_status: "Pending",
        remarks: notes || null,
      });
    }

    res.status(201).json({ success: true, message: "Order created!", data });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "Order not found!"));
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    // PostgREST caps a response at 1000 rows; page through with .range()
    // so the client receives every order (not a silent 1000-row slice).
    const PAGE = 1000;
    let all = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (error) return next(createHttpError(500, error.message));
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;
      offset += PAGE;
    }

    res.status(200).json({ data: all });
  } catch (error) {
    next(error);
  }
};

// Edit an existing order: change items / quantities / discount and recompute the bill.
// Revenue follows automatically because the reports read bills.totalWithTax.
// (Also still accepts a legacy orderStatus for backward compatibility.)
const updateOrder = async (req, res, next) => {
  try {
    const { orderStatus, items, bills, discount } = req.body;
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const patch = { updated_at: new Date().toISOString() };

    // Legacy status field.
    if (orderStatus !== undefined) patch.order_status = orderStatus;

    // Edited item list.
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return next(createHttpError(400, "An order must have at least one item. To cancel, delete the order instead."));
      }
      patch.items = items;
    }

    // Recomputed bill.
    if (bills !== undefined) {
      if (!bills || !isNonNegativeNumber(bills.totalWithTax)) {
        return next(createHttpError(400, "Something's wrong with the order total. Please review and try again."));
      }
      patch.bills = bills;
    }

    // Recomputed discount.
    if (discount !== undefined) patch.discount_amount = discount?.amount || 0;

    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "Order not found!"));
    }

    // Keep the pending-payments tracker in sync (only rows still awaiting payment).
    if (items !== undefined || bills !== undefined) {
      const pendingPatch = { updated_at: new Date().toISOString() };
      if (items !== undefined) pendingPatch.items = items;
      if (bills !== undefined) {
        pendingPatch.total_amount = bills.totalWithTax || 0;
        pendingPatch.pending_amount = bills.totalWithTax || 0;
      }
      await supabase
        .from("pending_payments")
        .update(pendingPatch)
        .eq("order_id", id)
        .eq("payment_status", "Pending");
    }

    res.status(200).json({ success: true, message: "Order updated", data });
  } catch (error) {
    next(error);
  }
};

// Mark an order Paid: settle any pending row + free its table.
const settleOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: "Paid", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "Order not found!"));
    }

    // Once paid, remove it from the pending ledger entirely.
    await supabase
      .from("pending_payments")
      .delete()
      .eq("order_id", id);

    // Free the linked table, if any.
    if (data.table?._id) {
      await supabase
        .from("tables")
        .update({ status: "Available", current_order_id: null })
        .eq("id", data.table._id);
    }

    res.status(200).json({ success: true, message: "Order settled!", data });
  } catch (error) {
    next(error);
  }
};

// Delete an order (Admin/Superadmin). Frees its table and removes any pending
// ledger row (pending_payments cascades on the FK, but we free the table explicitly).
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data: order } = await supabase
      .from("orders")
      .select("table_id")
      .eq("id", id)
      .maybeSingle();

    if (!order) {
      return next(createHttpError(404, "Order not found!"));
    }

    // Free the table currently holding this order, if any.
    if (order.table_id) {
      await supabase
        .from("tables")
        .update({ status: "Available", current_order_id: null })
        .eq("id", order.table_id);
    }

    // Remove any pending ledger row for this order.
    await supabase.from("pending_payments").delete().eq("order_id", id);

    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ success: true, message: "Order deleted!" });
  } catch (error) {
    next(error);
  }
};

module.exports = { addOrder, getOrderById, getOrders, updateOrder, settleOrder, deleteOrder };
