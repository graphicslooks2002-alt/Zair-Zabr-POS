import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { FaPlus, FaMinus, FaTrash, FaSearch, FaArrowLeft, FaChair } from "react-icons/fa";
import { menus as defaultMenu } from "../constants";
import { addOrder, updateTable, getMenu } from "../https/index";
import Invoice from "../components/invoice/Invoice";

const CreateOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const presetTable = location.state?.table || null; // { tableId, tableNo }

  useEffect(() => {
    document.title = "Zair Zabar POS | New Order";
  }, []);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("Dine In");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");

  // Live menu from DB; fall back to the bundled default until the DB is seeded.
  const { data: menuRes } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => getMenu(),
    placeholderData: keepPreviousData,
  });
  const menus = menuRes?.data?.data?.length ? menuRes.data.data : defaultMenu;
  useEffect(() => {
    setActiveCategory((cur) => {
      if (cur && menus.some((m) => m.id === cur.id)) return cur;
      return menus[0] || null;
    });
  }, [menus]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [payChoice, setPayChoice] = useState("Cash");
  const [showOnlineConfirm, setShowOnlineConfirm] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Draggable splitter: resize the cart panel (and thus the menu) width.
  const [cartWidth, setCartWidth] = useState(460);
  const dragging = useRef(false);
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const w = window.innerWidth - e.clientX;
      setCartWidth(Math.min(720, Math.max(340, w)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Deals carry their contents in brackets e.g. "Friends Deal (1 Small Pizza, ...)".
  // Strip that for the cart/receipt, but keep size brackets like "(L)" / "(XL)" / "(5pcs)"
  // (those have no comma).
  const cleanName = (n) => n.replace(/\s*\([^)]*,[^)]*\)\s*$/, "").trim();

  // Flattened catalog for global search.
  const allItems = useMemo(
    () => menus.flatMap((m) => m.items.map((it) => ({ ...it, cat: m.name }))),
    []
  );
  const q = search.trim().toLowerCase();
  const visibleItems = q
    ? allItems.filter((i) => i.name.toLowerCase().includes(q))
    : activeCategory?.items || [];

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

  const orderMutation = useMutation({
    mutationFn: (payload) => addOrder(payload),
    onSuccess: (res) => {
      const { data } = res.data;
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
      // Book the selected table (freed later when the order is settled/Paid).
      if (presetTable?.tableId) {
        updateTable({ tableId: presetTable.tableId, status: "Booked", orderId: data._id })
          .then(() => queryClient.invalidateQueries({ queryKey: ["tables"] }))
          .catch(() => {});
      }
      enqueueSnackbar("Order created!", { variant: "success" });
      setOrderInfo(data);
      setShowInvoice(true);
    },
    onError: (err) =>
      enqueueSnackbar(err?.response?.data?.message || "Could not place the order. Please try again.", { variant: "error" }),
  });

  const buildPayload = (paymentStatus, paymentMethod) => ({
    customerDetails: { name: customerName || "Walk-in Customer", phone: customerPhone || "N/A", guests: 0 },
    orderType: presetTable ? "Dine In" : orderType,
    bills: {
      total: subtotal,
      discount: discountAmount,
      discountType,
      discountValue: Number(discountValue || 0),
      tax: 0,
      totalWithTax: total,
    },
    items: cart,
    paymentMethod,
    paymentStatus,
    discount: { type: discountType, value: Number(discountValue || 0), amount: discountAmount },
    notes,
    table: presetTable?.tableId || null,
  });

  const place = (paymentStatus, paymentMethod) => {
    if (orderMutation.isPending) return;
    if (cart.length === 0) {
      enqueueSnackbar("Please select a product before placing the order.", { variant: "warning" });
      return;
    }
    orderMutation.mutate(buildPayload(paymentStatus, paymentMethod));
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      enqueueSnackbar("Please select a product before placing the order.", { variant: "warning" });
      return;
    }
    if (payChoice === "Online") return setShowOnlineConfirm(true);
    if (payChoice === "Pending") return place("Pending", "Pending");
    place("Paid", "Cash");
  };

  if (showInvoice && orderInfo) {
    return <Invoice orderInfo={orderInfo} setShowInvoice={() => navigate("/orders")} />;
  }

  return (
    <div className="bg-[#1f1f1f] h-[calc(100vh-64px)] flex overflow-hidden">
      {/* LEFT: menu + search */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex items-center gap-4 px-6 py-4 shrink-0">
          <button onClick={() => navigate("/orders")} className="bg-[#262626] text-white p-2 rounded-lg">
            <FaArrowLeft />
          </button>
          <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-wider">New Order</h1>
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-4 py-2 ml-auto w-[320px]">
            <FaSearch className="text-[#ababab]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any dish or deal..."
              className="bg-transparent outline-none text-[#f5f5f5] text-sm w-full"
            />
          </div>
        </div>

        {!q && (
          <div className="flex gap-2 px-6 pb-2 overflow-x-auto scrollbar-hide shrink-0">
            {menus.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveCategory(m)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                  activeCategory?.id === m.id ? "text-white" : "bg-[#1a1a1a] text-[#ababab]"
                }`}
                style={{ backgroundColor: activeCategory?.id === m.id ? m.bgColor : undefined }}
              >
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 py-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
            {visibleItems.length === 0 ? (
              <p className="text-gray-500 col-span-full">No dishes match "{search}".</p>
            ) : (
              visibleItems.map((item) => {
                const inCart = cart.find((c) => c.name === cleanName(item.name));
                return (
                  <button
                    key={`${item.cat || activeCategory?.name}-${item.id}`}
                    onClick={() => addItem(item)}
                    className="relative bg-[#262626] hover:bg-[#2e2e2e] rounded-lg p-3 text-left"
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-[#e85d04] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <p className="text-[#f5f5f5] text-sm font-semibold leading-tight pr-6">{item.name}</p>
                    {q && <p className="text-[#777] text-xs mt-0.5">{item.cat}</p>}
                    <p className="text-[#02ca3a] text-sm mt-1">Rs{item.price}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Draggable splitter */}
      <div
        onMouseDown={() => {
          dragging.current = true;
          document.body.style.userSelect = "none";
        }}
        title="Drag to resize"
        className="w-1.5 shrink-0 cursor-col-resize bg-[#2a2a2a] hover:bg-[#e85d04] transition-colors"
      />

      {/* RIGHT: cart panel */}
      <div
        style={{ width: cartWidth }}
        className="shrink-0 bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col min-h-0"
      >
        {/* Scrollable region: customer + items + discount + totals */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="p-4 space-y-2 border-b border-[#2a2a2a]">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full bg-[#262626] text-white rounded-lg px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full bg-[#262626] text-white rounded-lg px-3 py-2.5 text-sm outline-none"
            />
            {presetTable ? (
              <div className="flex items-center justify-between bg-[#2e4a40] text-green-400 rounded-lg px-3 py-2.5 text-sm font-semibold">
                <span className="flex items-center gap-2"><FaChair /> Dine In · Table {presetTable.tableNo}</span>
                <button onClick={() => navigate("/tables")} className="text-[#ababab] text-xs underline">change</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {["Dine In", "Take Away"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                      orderType === t ? "bg-[#e85d04] text-white" : "bg-[#262626] text-[#ababab]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current order heading */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#222] sticky top-0 z-10">
            <span className="text-[#f5f5f5] text-sm font-semibold">Current Order</span>
            <span className="text-[#ababab] text-xs">{totalQty} item{totalQty === 1 ? "" : "s"}</span>
          </div>

          {/* cart items — natural height inside the scroll region */}
          <div className="p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm">No items yet.</p>
                <p className="text-gray-600 text-xs mt-1">Tap a dish on the left to add it.</p>
              </div>
            ) : (
              cart.map((i) => (
                <div key={i.name} className="flex items-center justify-between bg-[#262626] rounded-lg px-3 py-2.5">
                  <div className="min-w-0 mr-2">
                    <p className="text-[#f5f5f5] text-sm font-semibold truncate">{i.name}</p>
                    <p className="text-[#ababab] text-xs mt-0.5">Rs{i.pricePerQuantity} × {i.quantity} = <span className="text-[#02ca3a]">Rs{i.price}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => changeQty(i.name, -1)} className="bg-[#1a1a1a] text-[#e85d04] w-7 h-7 rounded flex items-center justify-center"><FaMinus size={10} /></button>
                    <span className="text-white text-sm w-6 text-center font-semibold">{i.quantity}</span>
                    <button onClick={() => changeQty(i.name, 1)} className="bg-[#1a1a1a] text-[#e85d04] w-7 h-7 rounded flex items-center justify-center"><FaPlus size={10} /></button>
                    <button onClick={() => removeItem(i.name)} className="text-red-500 w-7 h-7 flex items-center justify-center ml-0.5"><FaTrash size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* discount + notes + totals */}
          <div className="px-4 pb-4 space-y-2 border-t border-[#2a2a2a] pt-3">
            <div className="flex items-center gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="bg-[#262626] text-white text-sm rounded-lg px-2 py-2 outline-none"
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
                className="flex-1 bg-[#262626] text-white rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-[#262626] text-white rounded-lg px-3 py-2 text-sm outline-none"
            />
            <div className="text-sm text-[#ababab] space-y-1 pt-1">
              <div className="flex justify-between"><span>Subtotal</span><span>Rs{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>- Rs{discountAmount.toFixed(0)}</span></div>
            </div>
          </div>
        </div>

        {/* Pinned footer: total + payment + place order (always visible) */}
        <div className="shrink-0 border-t border-[#2a2a2a] p-3 space-y-2 bg-[#1a1a1a]">
          <div className="flex justify-between items-center text-[#f5f5f5] font-bold text-lg px-1">
            <span>Total</span><span>Rs{total.toFixed(0)}</span>
          </div>
          <div className="flex gap-2">
            {["Cash", "Online", "Pending"].map((p) => (
              <button
                key={p}
                onClick={() => setPayChoice(p)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                  payChoice === p ? "bg-[#025cca] text-white" : "bg-[#262626] text-[#ababab]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={orderMutation.isPending}
            className="w-full bg-[#e85d04] text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {orderMutation.isPending ? "Placing..." : "Place Order"}
          </button>
        </div>
      </div>

      {/* Online payment screenshot confirmation */}
      {showOnlineConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[110] p-4">
          <div className="bg-[#1f1f1f] rounded-lg p-6 w-full max-w-sm text-center">
            <h3 className="text-[#f5f5f5] text-lg font-semibold mb-2">Online Payment</h3>
            <p className="text-[#ababab] text-sm mb-5">Has the payment screenshot been received?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setShowOnlineConfirm(false); place("Paid", "Online"); }}
                className="w-full bg-[#02ca3a] text-white py-2.5 rounded-lg font-semibold">Yes — Paid</button>
              <button onClick={() => { setShowOnlineConfirm(false); place("Pending", "Online"); }}
                className="w-full bg-[#e85d04] text-white py-2.5 rounded-lg font-semibold">No — Mark Pending Payment</button>
              <button onClick={() => setShowOnlineConfirm(false)}
                className="w-full bg-[#262626] text-[#ababab] py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;
