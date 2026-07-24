import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { IoMdClose } from "react-icons/io";
import { addCategory } from "../../https/index";

const AddCategoryModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [bgColor, setBgColor] = useState("#e85d04");

  const mut = useMutation({
    mutationFn: () => addCategory({ name: name.trim(), icon, bgColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      enqueueSnackbar("Category added!", { variant: "success" });
      onClose();
    },
    onError: (err) => enqueueSnackbar(err?.response?.data?.message || "Failed to add category.", { variant: "error" }),
  });

  const submit = (e) => {
    e.preventDefault();
    if (mut.isPending) return;
    if (!name.trim()) return enqueueSnackbar("Category name is required.", { variant: "warning" });
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-surface rounded-lg w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-main text-lg font-semibold">Add Category</h2>
          <button onClick={onClose} className="text-main hover:text-red-500"><IoMdClose size={22} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name (e.g. Pizza)" required
            className="w-full bg-base text-main rounded-lg px-3 py-2.5 text-sm outline-none" />
          <div className="flex gap-2 items-center">
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🍕" maxLength={2}
              className="w-16 bg-base text-main rounded-lg px-2 py-2.5 text-sm outline-none text-center" />
            <label className="text-muted text-xs">Color</label>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-9 bg-base rounded-lg cursor-pointer" />
          </div>
          <button type="submit" disabled={mut.isPending}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold disabled:opacity-50">
            {mut.isPending ? "Adding..." : "Add Category"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCategoryModal;
