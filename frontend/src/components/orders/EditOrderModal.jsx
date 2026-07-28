import React, { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaMinus, FaTrash, FaSearch, FaTimes } from "react-icons/fa";
import { menus as defaultMenu } from "../../constants";
import { getMenu, updateOrderItems } from "../../https/index";

// Deals carry their contents in brackets e.g. "Friends Deal (1 Small Pizza, ...)".
// Strip that for the cart, but keep size brackets like "(L)" / "(5pcs)" (no comma).
const cleanName = (n) => n.replace(/\s*\([^)]*,[^)]*\)\s*$/, "").trim();

// Normalise a stored order item into the cart shape used here.
const toCartItem = (it) => {
  const quantity = Number(it.quantity) || 1;
  const pricePerQuantity =
    Number(it.pricePerQuantity) || (quantity ? Number(it.price) / quantity : Number(it.price)) || 0;
  return { name: it.name, pricePerQuantity, quantity, price: pricePerQuantity * quantity };
};

const EditOrderModal = ({ order, onClose }) => {
  const queryClient = useQueryClient();

  const [cart, setCart] = useState(() => (order.items || []).map(toCartItem));
  const [search, setSearch] = useState("");
  const [discountType, setDiscountType] = useState(order.bills?.discountType || "percent");
  const [discountValue, setDiscountValue] = useState(order.bills?.discountValue || 0);

  const { data: menuRes } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => getMenu(),
    placeholderData: keepPreviousData,
  });
  const menus = menuRes?.data?.data?.length ? menuRes.data.data : defaultMenu;

  const allItems = useMemo(
    () => menus.flatMap((m) => m.items.map((it) => ({ ...it, cat: m.name }))),
    [menus]
  );
  const q = search.trim().toLowerCase();
  const matches = q ? allItems.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 12) : [];

  // ---- cart ops ----
  const addItem = (item) => {
    const name = cleanName(item.name);
    setCart((prev) => {
      const found = prev.find((i) => i.name === name);
      if (found) {
        return prev.map((i) =>
          i.name === name
            ? { ...i, quantity: i.quantity + 1, price: (i.quantity + 1) * i.pricePerQuantity }
            : i
        );
      }
      return [...prev, { name, pricePerQuantity: item.price, price: item.price, quantity: 1 }];
    });
  };
  const changeQty = (name, delta) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.name === name
            ? { ...i, quantity: i.quantity + delta, price: (i.quantity + delta) * i.pricePerQuantity }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  const removeItem = (name) => setCart((prev) => prev.filter((i) => i.name !== name));
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  // ---- totals ----
  const { subtotal, discountAmount, total } = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.price, 0);
    let discountAmount =
      discountType === "percent"
        ? (subtotal * Number(discountValue || 0)) / 100
        : Number(discountValue || 0);
    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    return { subtotal, discountAmount, total: subtotal - discountAmount };
  }, [cart, discountType, discountValue]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateOrderItems({
        orderId: order._id,
        items: cart,
        bills: {
          total: subtotal,
          discount: discountAmount,
          discountType,
          discountValue: Number(discountValue || 0),
          tax: 0,
          totalWithTax: total,
        },
        discount: { type: discountType, value: Number(discountValue || 0), amount: discountAmount },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      enqueueSnackbar("Order updated!", { variant: "success" });
      onClose();
    },
    onError: (err) =>
      enqueueSnackbar(err?.response?.data?.message || "Could not update the order. Please try again.", {
        variant: "error",
      }),
  });

  const handleSave = () => {
    if (cart.length === 0) {
      enqueueSnackbar("An order must have at least one item.", { variant: "warning" });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[120] p-4">
      <div className="bg-base rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <div>
            <h3 className="text-main text-lg font-semibold">Edit Order</h3>
            <p className="text-muted text-xs">
              #{order._id.slice(-6)} · {order.customerDetails?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main p-1">
            <FaTimes />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
          {/* add-item search */}
          <div className="flex items-center gap-2 bg-panel rounded-lg px-3 py-2">
            <FaSearch className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a dish to add..."
              className="bg-transparent outline-none text-main text-sm w-full"
            />
          </div>
          {matches.length > 0 && (
            <div className="bg-[#181818] rounded-lg divide-y divide-line max-h-44 overflow-y-auto scrollbar-hide">
              {matches.map((item) => (
                <button
                  key={`${item.cat}-${item.id}`}
                  onClick={() => addItem(item)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface text-left"
                >
                  <span className="text-main text-sm">{item.name}</span>
                  <span className="text-success text-sm">+ Rs{item.price}</span>
                </button>
              ))}
            </div>
          )}

          {/* current items */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-main text-sm font-semibold">Items</span>
            <span className="text-muted text-xs">
              {totalQty} item{totalQty === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-2">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No items. Add one above.</p>
            ) : (
              cart.map((i) => (
                <div key={i.name} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2.5">
                  <div className="min-w-0 mr-2">
                    <p className="text-main text-sm font-semibold truncate">{i.name}</p>
                    <p className="text-muted text-xs mt-0.5">
                      Rs{i.pricePerQuantity} × {i.quantity} = <span className="text-success">Rs{i.price}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => changeQty(i.name, -1)} className="bg-panel text-accent w-7 h-7 rounded flex items-center justify-center">
                      <FaMinus size={10} />
                    </button>
                    <span className="text-main text-sm w-6 text-center font-semibold">{i.quantity}</span>
                    <button onClick={() => changeQty(i.name, 1)} className="bg-panel text-accent w-7 h-7 rounded flex items-center justify-center">
                      <FaPlus size={10} />
                    </button>
                    <button onClick={() => removeItem(i.name)} className="text-red-500 w-7 h-7 flex items-center justify-center ml-0.5">
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* discount */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="bg-surface text-main text-sm rounded-lg px-2 py-2 outline-none"
            >
              <option value="percent">%</option>
              <option value="fixed">Rs</option>
            </select>
            <input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Discount"
              className="flex-1 bg-surface text-main rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* totals */}
          <div className="text-sm text-muted space-y-1 pt-1 border-t border-line">
            <div className="flex justify-between pt-2"><span>Subtotal</span><span>Rs{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- Rs{discountAmount.toFixed(0)}</span></div>
          </div>
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-line p-3 space-y-2 bg-panel rounded-b-xl">
          <div className="flex justify-between items-center text-main font-bold text-lg px-1">
            <span>Total</span><span>Rs{total.toFixed(0)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 bg-surface text-muted py-2.5 rounded-lg text-sm font-semibold">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 bg-accent text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
