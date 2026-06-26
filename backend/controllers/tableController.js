const createHttpError = require("http-errors");
const supabase = require("../config/supabase");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// currentOrder embed disambiguated via tables.current_order_id FK (tables_current_order_fk).
const TABLE_SELECT =
  "_id:id, tableNo:table_no, status, seats, currentOrder:orders!tables_current_order_fk(_id:id, customerDetails:customer_details)";

const addTable = async (req, res, next) => {
  try {
    const { tableNo, seats } = req.body;
    if (!tableNo) {
      return next(createHttpError(400, "Please provide table No!"));
    }

    const { data: existing } = await supabase
      .from("tables")
      .select("id")
      .eq("table_no", tableNo)
      .maybeSingle();

    if (existing) {
      return next(createHttpError(400, "Table already exist!"));
    }

    const { data, error } = await supabase
      .from("tables")
      .insert({ table_no: tableNo, seats })
      .select(TABLE_SELECT)
      .single();

    if (error) return next(createHttpError(500, error.message));

    res.status(201).json({ success: true, message: "Table added!", data });
  } catch (error) {
    next(error);
  }
};

const getTables = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("tables")
      .select(TABLE_SELECT)
      .order("table_no", { ascending: true });

    if (error) return next(createHttpError(500, error.message));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateTable = async (req, res, next) => {
  try {
    const { status, orderId } = req.body;
    const { id } = req.params;

    if (!UUID_RE.test(id)) {
      return next(createHttpError(404, "Invalid id!"));
    }

    const { data, error } = await supabase
      .from("tables")
      .update({ status, current_order_id: orderId || null })
      .eq("id", id)
      .select(TABLE_SELECT)
      .single();

    if (error || !data) {
      return next(createHttpError(404, "Table not found!"));
    }

    res
      .status(200)
      .json({ success: true, message: "Table updated!", data });
  } catch (error) {
    next(error);
  }
};

module.exports = { addTable, getTables, updateTable };
