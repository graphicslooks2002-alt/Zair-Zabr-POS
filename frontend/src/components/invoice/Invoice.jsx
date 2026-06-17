import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa6";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    const printContent = invoiceRef.current.innerHTML;
    const WinPrint = window.open("", "", "width=900,height=650");
    WinPrint.document.write(`
      <html>
        <head>
          <title>Zair Zabar - Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 350px; margin: 0 auto; }
            h2 { text-align: center; margin: 5px 0; }
            p { margin: 2px 0; }
            .center { text-align: center; }
            .border-t { border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 8px; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .small { font-size: 12px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    WinPrint.document.close();
    WinPrint.focus();
    setTimeout(() => {
      WinPrint.print();
      WinPrint.close();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]">
      <div className="bg-white rounded-lg shadow-lg w-[380px] max-h-[90vh] flex flex-col">
        {/* Scrollable receipt */}
        <div className="overflow-y-auto flex-1 p-4" ref={invoiceRef}>
          {/* Success icon */}
          <div className="flex justify-center mb-3">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 150 }}
              className="w-10 h-10 border-4 border-green-500 rounded-full flex items-center justify-center bg-green-500"
            >
              <FaCheck className="text-white text-lg" />
            </motion.div>
          </div>

          <h2 className="text-lg font-bold text-center">Zair Zabar</h2>
          <p className="text-gray-500 text-center text-xs">
            Vital Market 50 Wala Road, Near Sarim Hospital, Haroonabad
          </p>
          <p className="text-gray-500 text-center text-xs">Ph: 03194562211</p>
          <p className="text-gray-600 text-center text-xs mt-1">
            Thank you for your order!
          </p>

          {/* Order Details */}
          <div className="mt-3 border-t border-dashed pt-3 text-xs text-gray-700">
            <p><strong>Order ID:</strong> {orderInfo._id ? orderInfo._id.slice(-6) : Math.floor(new Date(orderInfo.orderDate).getTime())}</p>
            <p><strong>Name:</strong> {orderInfo.customerDetails.name}</p>
            <p><strong>Phone:</strong> {orderInfo.customerDetails.phone}</p>
            <p><strong>Guests:</strong> {orderInfo.customerDetails.guests}</p>
          </div>

          {/* Items */}
          <div className="mt-3 border-t border-dashed pt-3">
            <h3 className="text-xs font-semibold mb-1">Items Ordered</h3>
            {orderInfo.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs text-gray-700 py-0.5">
                <span>{item.name} x{item.quantity}</span>
                <span>Rs{item.price.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Bills */}
          <div className="mt-3 border-t border-dashed pt-3 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs{orderInfo.bills.total.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>Rs{orderInfo.bills.tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>Grand Total</span>
              <span>Rs{orderInfo.bills.totalWithTax.toFixed(0)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-2 border-t border-dashed pt-2 text-xs text-gray-600">
            <p><strong>Payment:</strong> {orderInfo.paymentMethod}</p>
            {orderInfo.paymentMethod === "Online" && orderInfo.paymentData && (
              <>
                <p><strong>Razorpay ID:</strong> {orderInfo.paymentData.razorpay_payment_id}</p>
              </>
            )}
          </div>
        </div>

        {/* Fixed buttons at bottom */}
        <div className="flex gap-2 p-3 border-t shrink-0">
          <button
            onClick={handlePrint}
            className="bg-[#025cca] text-white px-4 py-2 rounded-lg text-sm font-semibold w-full"
          >
            Print Receipt
          </button>
          <button
            onClick={() => setShowInvoice(false)}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold w-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
