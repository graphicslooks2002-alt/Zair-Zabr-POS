import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { IoMdClose } from "react-icons/io";
import { getMenu, addProduct } from "../../https/index";

const AddItemModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const { data: menuRes } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => getMenu(),
    placeholderData: keepPreviousData,
  });
  const categories = menuRes?.data?.data || [];

  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0]._id);
  }, [categories, categoryId]);

  const mut = useMutation({
    mutationFn: () => addProduct({ categoryId, name: name.trim(), price: Number(price) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      enqueueSnackbar("Item added!", { variant: "success" });
      onClose();
    },
    onError: (err) => enqueueSnackbar(err?.response?.data?.message || "Failed to add item.", { variant: "error" }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (mut.isPending) return;
    if (!categoryId) return enqueueSnackbar("Please select a category.", { variant: "warning" });
    if (!name.trim()) return enqueueSnackbar("Item name is required.", { variant: "warning" });
    if (price === "" || Number(price) < 0) return enqueueSnackbar("Enter a valid price (0 or more).", { variant: "warning" });
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#262626] rounded-lg w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#f5f5f5] text-lg font-semibold">Add Item</h2>
          <button onClick={onClose} className="text-[#f5f5f5] hover:text-red-500"><IoMdClose size={22} /></button>
        </div>
        {categories.length === 0 ? (
          <p className="text-[#ababab] text-sm">No categories yet. Add a category first (every item must belong to a category).</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[#ababab] text-xs mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none">
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name (e.g. Zinger Burger)" required
              className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price"
              className="w-full bg-[#1f1f1f] text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            <button type="submit" disabled={mut.isPending}
              className="w-full bg-[#e85d04] text-white py-3 rounded-lg font-semibold disabled:opacity-50">
              {mut.isPending ? "Adding..." : "Add Item"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddItemModal;
