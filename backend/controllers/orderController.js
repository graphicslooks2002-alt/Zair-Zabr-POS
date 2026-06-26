const createHttpError = require("http-errors");
const supabase = require("../config/supabase");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Aliases map snake_case columns back to the camelCase / _id shape the frontend expects.
// table embed disambiguated via the orders.table_id FK (auto name: orders_table_id_fkey).
const ORDER_SELECT =
  "_id:id, customerDetails:customer_details, orderStatus:order_status, orderDate:order_date, bills, items, paymentMethod:payment_method, paymentData:payment_data, table:tables!orders_table_id_fkey(_id:id, tableNo:table_no)";

const addOrder = async (req, res, next) => {
  try {
    const {
      customerDetails,
      orderStatus,
      bills,
      items,
      paymentMethod,
      paymentData,
      table,
    } = req.body;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_details: customerDetails,
        order_status: orderStatus,
        bills,
        items: items || [],
        payment_method: paymentMethod || null,
        payment_data: paymentData || null,
        table_id: table || null,
      })
      .select(ORDER_SELECT)
      .single();

    if (error) return next(createHttpError(500, error.message));

    res
      .status(201)
      .json({ success: true, message: "Order created!", data });
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

    res
      .status(200)
      .json({ success: true, message: "Order updated", data });
  } catch (error) {
    next(error);
  }
};

module.exports = { addOrder, getOrderById, getOrders, updateOrder };
