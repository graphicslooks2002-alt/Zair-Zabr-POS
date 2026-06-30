const createHttpError = require("http-errors");
const supabase = require("../config/supabase");
const { isNonNegativeNumber } = require("../utils/validate");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shape categories + nested products into the menu structure the frontend expects.
const getMenu = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, icon, bg_color, sort_order, products(id, name, price, sort_order)")
      .order("sort_order", { ascending: true });

    if (error) return next(createHttpError(500, error.message));

    const menu = (data || []).map((c) => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      icon: c.icon,
      bgColor: c.bg_color,
      items: (c.products || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({ _id: p.id, id: p.id, name: p.name, price: Number(p.price) })),
    }));

    res.status(200).json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

// ---------- CATEGORY ----------
const addCategory = async (req, res, next) => {
  try {
    const { name, icon, bgColor, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return next(createHttpError(400, "Category name is required."));
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), icon: icon || null, bg_color: bgColor || "#e85d04", sort_order: sortOrder || 0 })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return next(createHttpError(400, "A category with this name already exists."));
      return next(createHttpError(500, error.message));
    }
    res.status(201).json({ success: true, message: "Category added!", data });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid category id."));
    const { name, icon, bgColor, sortOrder } = req.body;
    const patch = {};
    if (name !== undefined) {
      if (!name.trim()) return next(createHttpError(400, "Category name cannot be empty."));
      patch.name = name.trim();
    }
    if (icon !== undefined) patch.icon = icon;
    if (bgColor !== undefined) patch.bg_color = bgColor;
    if (sortOrder !== undefined) patch.sort_order = sortOrder;

    const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select("*").single();
    if (error || !data) return next(createHttpError(404, "Category not found."));
    res.status(200).json({ success: true, message: "Category updated!", data });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid category id."));
    // Deleting a category removes its products (ON DELETE CASCADE).
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return next(createHttpError(500, error.message));
    res.status(200).json({ success: true, message: "Category and its products deleted." });
  } catch (error) {
    next(error);
  }
};

// ---------- PRODUCT ----------
const addProduct = async (req, res, next) => {
  try {
    const { categoryId, name, price, sortOrder } = req.body;
    // Business rule: a product must be assigned to a category.
    if (!categoryId || !UUID_RE.test(categoryId)) {
      return next(createHttpError(400, "Please select a category for this product."));
    }
    if (!name || !name.trim()) {
      return next(createHttpError(400, "Product name is required."));
    }
    if (!isNonNegativeNumber(price)) {
      return next(createHttpError(400, "Price must be a number of 0 or more."));
    }
    // Ensure the category exists.
    const { data: cat } = await supabase.from("categories").select("id").eq("id", categoryId).maybeSingle();
    if (!cat) return next(createHttpError(400, "Selected category does not exist."));

    const { data, error } = await supabase
      .from("products")
      .insert({ category_id: categoryId, name: name.trim(), price: Number(price), sort_order: sortOrder || 0 })
      .select("*")
      .single();
    if (error) return next(createHttpError(500, error.message));
    res.status(201).json({ success: true, message: "Product added!", data });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid product id."));
    const { categoryId, name, price, sortOrder } = req.body;
    const patch = { updated_at: new Date().toISOString() };
    if (categoryId !== undefined) {
      if (!UUID_RE.test(categoryId)) return next(createHttpError(400, "Invalid category."));
      patch.category_id = categoryId;
    }
    if (name !== undefined) {
      if (!name.trim()) return next(createHttpError(400, "Product name cannot be empty."));
      patch.name = name.trim();
    }
    if (price !== undefined) {
      if (!isNonNegativeNumber(price)) return next(createHttpError(400, "Price must be a number of 0 or more."));
      patch.price = Number(price);
    }
    if (sortOrder !== undefined) patch.sort_order = sortOrder;

    const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("*").single();
    if (error || !data) return next(createHttpError(404, "Product not found."));
    res.status(200).json({ success: true, message: "Product updated!", data });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return next(createHttpError(404, "Invalid product id."));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return next(createHttpError(500, error.message));
    res.status(200).json({ success: true, message: "Product deleted." });
  } catch (error) {
    next(error);
  }
};

// One-time import of the default (hardcoded) menu. Skips if a menu already exists.
const seedMenu = async (req, res, next) => {
  try {
    const { categories } = req.body; // [{ name, icon, bgColor, items: [{name, price}] }]
    if (!Array.isArray(categories) || categories.length === 0) {
      return next(createHttpError(400, "No menu data provided."));
    }
    const { count } = await supabase.from("categories").select("id", { head: true, count: "exact" });
    if (count) return next(createHttpError(400, "Menu already exists. Import skipped."));

    for (let ci = 0; ci < categories.length; ci++) {
      const c = categories[ci];
      const { data: cat, error: ce } = await supabase
        .from("categories")
        .insert({ name: c.name, icon: c.icon || null, bg_color: c.bgColor || "#e85d04", sort_order: ci })
        .select("id")
        .single();
      if (ce) return next(createHttpError(500, ce.message));

      const rows = (c.items || []).map((it, pi) => ({
        category_id: cat.id,
        name: it.name,
        price: Number(it.price) || 0,
        sort_order: pi,
      }));
      if (rows.length) {
        const { error: pe } = await supabase.from("products").insert(rows);
        if (pe) return next(createHttpError(500, pe.message));
      }
    }
    res.status(201).json({ success: true, message: "Default menu imported!" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateProduct,
  deleteProduct,
  seedMenu,
};
