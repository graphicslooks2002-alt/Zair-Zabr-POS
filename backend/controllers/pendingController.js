const createHttpError = require("http-errors");
const supabase = require("../config/supabase");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PENDING_SELECT =
  "_id:id, orderId:order_id, customerName:customer_name, phone, items, totalAmount:total_amount, pendingAmount:pending_amount, orderDate:order_date, paymentStatus:payment_status, remarks, createdAt:created_at";

const getPendingPayments = async (req, res, next) => {
  try {
    const { status } = req.query; // optional: 'Pending' | 'Paid'
    let query = supabase
      .from("pending_payments")
      .select(PENDING_SELECT)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("payment_status", status);

    const { data, error } = await query;
    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Settle a pending payment: mark it Paid, mark its order Paid, free its table.
const settlePending = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data: pending } = await supabase
      .from("pending_payments")
      .select("id, order_id")
      .eq("id", id)
      .maybeSingle();

    if (!pending) {
      return next(createHttpError(404, "Pending payment not found!"));
    }

    const { data, error } = await supabase
      .from("pending_payments")
      .update({ payment_status: "Paid", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(PENDING_SELECT)
      .single();

    if (error) return next(createHttpError(500, error.message));

    if (pending.order_id) {
      await supabase
        .from("orders")
        .update({ payment_status: "Paid", updated_at: new Date().toISOString() })
        .eq("id", pending.order_id);

      // Free the table linked to this order, if any.
      const { data: order } = await supabase
        .from("orders")
        .select("table_id")
        .eq("id", pending.order_id)
        .maybeSingle();

      if (order?.table_id) {
        await supabase
          .from("tables")
          .update({ status: "Available", current_order_id: null })
          .eq("id", order.table_id);
      }
    }

    res.status(200).json({ success: true, message: "Payment settled!", data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPendingPayments, settlePending };
