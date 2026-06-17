import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTotalPrice } from "../../redux/slices/cartSlice";
import {
  addOrder,
  createOrderRazorpay,
  updateTable,
  verifyPaymentRazorpay,
} from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";
import Invoice from "../invoice/Invoice";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const Bill = () => {
  const dispatch = useDispatch();
  const customerData = useSelector((state) => state.customer);
  const cartData = useSelector((state) => state.cart);
  const total = useSelector(getTotalPrice);
  const taxRate = 0;
  const tax = (total * taxRate) / 100;
  const totalPriceWithTax = total + tax;

  const [paymentMethod, setPaymentMethod] = useState();
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState();

  const handlePlaceOrder = async () => {
    if (cartData.length === 0) {
      enqueueSnackbar("Add items to cart first!", { variant: "warning" });
      return;
    }
    if (!paymentMethod) {
      enqueueSnackbar("Please select a payment method!", { variant: "warning" });
      return;
    }

    if (paymentMethod === "Online") {
      try {
        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!res) {
          enqueueSnackbar("Razorpay SDK failed to load.", { variant: "warning" });
          return;
        }
        const reqData = { amount: totalPriceWithTax.toFixed(2) };
        const { data } = await createOrderRazorpay(reqData);
        const options = {
          key: `${import.meta.env.VITE_RAZORPAY_KEY_ID}`,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "ZAIR ZABAR",
          description: "Secure Payment for Your Meal",
          order_id: data.order.id,
          handler: async function (response) {
            const verification = await verifyPaymentRazorpay(response);
            enqueueSnackbar(verification.data.message, { variant: "success" });
            const orderData = {
              customerDetails: {
                name: customerData.customerName || "Walk-in Customer",
                phone: customerData.customerPhone || "N/A",
                guests: customerData.guests || 0,
              },
              orderStatus: "In Progress",
              bills: { total, tax, totalWithTax: totalPriceWithTax },
              items: cartData,
              paymentMethod,
              paymentData: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
              },
            };
            if (customerData.table?.tableId) {
              orderData.table = customerData.table.tableId;
            }
            setTimeout(() => orderMutation.mutate(orderData), 1500);
          },
          prefill: { name: customerData.name, email: "", contact: customerData.phone },
          theme: { color: "#e85d04" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        enqueueSnackbar("Payment Failed!", { variant: "error" });
      }
    } else {
      const orderData = {
        customerDetails: {
          name: customerData.customerName || "Walk-in Customer",
          phone: customerData.customerPhone || "N/A",
          guests: customerData.guests || 0,
        },
        orderStatus: "In Progress",
        bills: { total, tax, totalWithTax: totalPriceWithTax },
        items: cartData,
        paymentMethod,
      };
      if (customerData.table?.tableId) {
        orderData.table = customerData.table.tableId;
      }
      orderMutation.mutate(orderData);
    }
  };

  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      setOrderInfo(data);
      if (data.table) {
        const tableData = { status: "Booked", orderId: data._id, tableId: data.table };
        setTimeout(() => tableUpdateMutation.mutate(tableData), 1500);
      } else {
        dispatch(removeCustomer());
        dispatch(removeAllItems());
      }
      enqueueSnackbar("Order Placed!", { variant: "success" });
      setShowInvoice(true);
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar("Failed to place order!", { variant: "error" });
    },
  });

  const tableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateTable(reqData),
    onSuccess: () => {
      dispatch(removeCustomer());
      dispatch(removeAllItems());
    },
    onError: (error) => console.log(error),
  });

  return (
    <>
      <div className="px-3 py-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#ababab]">Items({cartData.length})</p>
          <h1 className="text-[#f5f5f5] text-sm font-bold">Rs{total.toFixed(0)}</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#ababab]">Tax({taxRate}%)</p>
          <h1 className="text-[#f5f5f5] text-sm font-bold">Rs{tax.toFixed(0)}</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#f5f5f5] font-semibold">Total</p>
          <h1 className="text-[#e85d04] text-lg font-bold">Rs{totalPriceWithTax.toFixed(0)}</h1>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setPaymentMethod("Cash")}
            className={`px-2 py-1.5 w-full rounded-lg text-xs font-semibold ${
              paymentMethod === "Cash"
                ? "bg-[#e85d04] text-white"
                : "bg-[#1f1f1f] text-[#ababab]"
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setPaymentMethod("Online")}
            className={`px-2 py-1.5 w-full rounded-lg text-xs font-semibold ${
              paymentMethod === "Online"
                ? "bg-[#e85d04] text-white"
                : "bg-[#1f1f1f] text-[#ababab]"
            }`}
          >
            Online
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 mb-1">
          <button className="bg-[#025cca] px-3 py-2.5 w-full rounded-lg text-white font-semibold text-sm">
            Print Receipt
          </button>
          <button
            onClick={handlePlaceOrder}
            className="bg-[#e85d04] px-3 py-2.5 w-full rounded-lg text-white font-semibold text-sm"
          >
            Place Order
          </button>
        </div>
      </div>

      {showInvoice && (
        <Invoice orderInfo={orderInfo} setShowInvoice={setShowInvoice} />
      )}
    </>
  );
};

export default Bill;
