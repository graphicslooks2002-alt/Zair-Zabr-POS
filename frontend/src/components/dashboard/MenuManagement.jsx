import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaTrash, FaEdit, FaTimes } from "react-icons/fa";
import {
  getMenu,
  seedMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../../https/index";
import { menus as defaultMenu } from "../../constants";

const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [activeCatId, setActiveCatId] = useState(null);

  // category form
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catColor, setCatColor] = useState("#e85d04");

  // product form (add/edit)
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: resData, isError } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => getMenu(),
    placeholderData: keepPreviousData,
  });
  useEffect(() => {
    if (isError) enqueueSnackbar("Failed to load menu.", { variant: "error" });
  }, [isError]);

  const menu = resData?.data?.data || [];
  const activeCat = menu.find((c) => c._id === activeCatId) || menu[0] || null;

  useEffect(() => {
    if (!activeCatId && menu[0]) setActiveCatId(menu[0]._id);
  }, [menu, activeCatId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["menu"] });
  const onErr = (err) =>
    enqueueSnackbar(err?.response?.data?.message || "Action failed.", { variant: "error" });

  const seedMut = useMutation({
    mutationFn: () => seedMenu(defaultMenu.map((c) => ({ name: c.name, icon: c.icon, bgColor: c.bgColor, items: c.items.map((i) => ({ name: i.name, price: i.price })) }))),
    onSuccess: () => { refresh(); enqueueSnackbar("Default menu imported!", { variant: "success" }); },
    onError: onErr,
  });

  const addCatMut = useMutation({
    mutationFn: () => addCategory({ name: catName, icon: catIcon, bgColor: catColor }),
    onSuccess: () => { refresh(); setCatName(""); setCatIcon(""); enqueueSnackbar("Category added!", { variant: "success" }); },
    onError: onErr,
  });
  const delCatMut = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => { refresh(); setActiveCatId(null); enqueueSnackbar("Category deleted.", { variant: "success" }); },
    onError: onErr,
  });

  const addProdMut = useMutation({
    mutationFn: () => addProduct({ categoryId: activeCat?._id, name: prodName, price: Number(prodPrice) }),
    onSuccess: () => { refresh(); setProdName(""); setProdPrice(""); enqueueSnackbar("Product added!", { variant: "success" }); },
    onError: onErr,
  });
  const updProdMut = useMutation({
    mutationFn: () => updateProduct(editingProduct._id, { name: prodName, price: Number(prodPrice) }),
    onSuccess: () => { refresh(); setEditingProduct(null); setProdName(""); setProdPrice(""); enqueueSnackbar("Product updated!", { variant: "success" }); },
    onError: onErr,
  });
  const delProdMut = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => { refresh(); enqueueSnackbar("Product deleted.", { variant: "success" }); },
    onError: onErr,
  });

  const submitProduct = (e) => {
    e.preventDefault();
    if (!activeCat) return enqueueSnackbar("Create/select a category first.", { variant: "warning" });
    if (!prodName.trim()) return enqueueSnackbar("Product name is required.", { variant: "warning" });
    if (prodPrice === "" || Number(prodPrice) < 0) return enqueueSnackbar("Enter a valid price (0 or more).", { variant: "warning" });
    editingProduct ? updProdMut.mutate() : addProdMut.mutate();
  };

  const startEdit = (p) => { setEditingProduct(p); setProdName(p.name); setProdPrice(String(p.price)); };
  const cancelEdit = () => { setEditingProduct(null); setProdName(""); setProdPrice(""); };

  // Empty menu → offer import.
  if (menu.length === 0) {
    return (
      <div className="container mx-auto py-10 px-6 text-center">
        <h2 className="text-[#f5f5f5] text-xl font-semibold mb-2">Menu is empty</h2>
        <p className="text-[#ababab] text-sm mb-5">Import the default menu to get started, then edit anything.</p>
        <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
          className="bg-[#e85d04] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50">
          {seedMut.isPending ? "Importing..." : "Import Default Menu"}
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 px-6">
      <h2 className="font-semibold text-[#f5f5f5] text-xl mb-1">Menu Management</h2>
      <p className="text-sm text-[#ababab] mb-4">Add, edit, remove categories and products. Every product belongs to a category.</p>

      <div className="grid grid-cols-3 gap-4">
        {/* CATEGORIES */}
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <h3 className="text-[#f5f5f5] font-semibold mb-3">Categories</h3>
          <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-hide">
            {menu.map((c) => (
              <div key={c._id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${activeCat?._id === c._id ? "bg-[#262626]" : "hover:bg-[#222]"}`}
                onClick={() => setActiveCatId(c._id)}>
                <span className="text-[#f5f5f5] text-sm">{c.icon} {c.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${c.name}" and all its products?`)) delCatMut.mutate(c._id); }}
                  className="text-red-500 text-xs"><FaTrash /></button>
              </div>
            ))}
          </div>
          {/* add category */}
          <div className="mt-3 border-t border-[#333] pt-3 space-y-2">
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name"
              className="w-full bg-[#262626] text-white rounded-lg px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="Icon (emoji)" maxLength={2}
                className="w-16 bg-[#262626] text-white rounded-lg px-2 py-2 text-sm outline-none text-center" />
              <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)}
                className="w-10 h-9 bg-[#262626] rounded-lg cursor-pointer" />
              <button onClick={() => catName.trim() ? addCatMut.mutate() : enqueueSnackbar("Enter a category name.", { variant: "warning" })}
                disabled={addCatMut.isPending}
                className="flex-1 bg-[#e85d04] text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                <FaPlus size={11} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* PRODUCTS */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 col-span-2">
          <h3 className="text-[#f5f5f5] font-semibold mb-3">
            {activeCat ? <>Products in <span style={{ color: activeCat.bgColor }}>{activeCat.icon} {activeCat.name}</span></> : "Select a category"}
          </h3>

          {activeCat && (
            <>
              <div className="max-h-[280px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-left text-sm">
                  <thead className="text-[#ababab] border-b border-[#333]">
                    <tr><th className="px-2 py-2">Product</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="text-[#f5f5f5]">
                    {activeCat.items.length === 0 ? (
                      <tr><td colSpan={3} className="px-2 py-4 text-center text-gray-500">No products yet.</td></tr>
                    ) : (
                      activeCat.items.map((p) => (
                        <tr key={p._id} className="border-b border-[#262626]">
                          <td className="px-2 py-2">{p.name}</td>
                          <td className="px-2 py-2 text-right">Rs{p.price}</td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => startEdit(p)} className="text-[#025cca]"><FaEdit /></button>
                              <button onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) delProdMut.mutate(p._id); }} className="text-red-500"><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* add / edit product */}
              <form onSubmit={submitProduct} className="mt-4 border-t border-[#333] pt-3">
                <p className="text-[#ababab] text-xs mb-2">{editingProduct ? `Editing: ${editingProduct.name}` : `Add product to ${activeCat.name}`}</p>
                <div className="flex gap-2">
                  <input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Product / variant name"
                    className="flex-1 bg-[#262626] text-white rounded-lg px-3 py-2 text-sm outline-none" />
                  <input type="number" min="0" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="Price"
                    className="w-28 bg-[#262626] text-white rounded-lg px-3 py-2 text-sm outline-none" />
                  <button type="submit" disabled={addProdMut.isPending || updProdMut.isPending}
                    className="bg-[#02ca3a] text-white px-4 rounded-lg text-sm font-semibold disabled:opacity-50">
                    {editingProduct ? "Save" : "Add"}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={cancelEdit} className="bg-[#262626] text-[#ababab] px-3 rounded-lg"><FaTimes /></button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
