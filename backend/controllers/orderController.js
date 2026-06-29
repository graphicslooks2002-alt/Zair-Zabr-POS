const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { findOpenSession } = require("./sessionController");

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

    // Link the order to the currently open business session (if any).
    const session = await findOpenSession();

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
        session_id: session?.id || null,
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
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false });

    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// Legacy status update (kept for compatibility; status workflow is deprecated).
const updateOrder = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ order_status: orderStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "Order not found!"));
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

    // Settle matching pending payment rows.
    await supabase
      .from("pending_payments")
      .update({ payment_status: "Paid", updated_at: new Date().toISOString() })
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

module.exports = { addOrder, getOrderById, getOrders, updateOrder, settleOrder };
