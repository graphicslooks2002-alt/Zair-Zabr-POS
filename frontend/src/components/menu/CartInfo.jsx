import React, { useEffect, useRef } from "react";
import { RiDeleteBin2Fill } from "react-icons/ri";
import { FaPlus, FaMinus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { removeItem, incrementItem, decrementItem } from "../../redux/slices/cartSlice";

const CartInfo = () => {
  const cartData = useSelector((state) => state.cart);
  const scrollRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [cartData]);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-md text-[#e4e4e4] font-semibold">Order Details</h1>
        <span className="text-xs text-[#ababab]">{cartData.length} items</span>
      </div>
      <div ref={scrollRef}>
        {cartData.length === 0 ? (
          <p className="text-[#ababab] text-sm text-center py-10">
            Your cart is empty. Start adding items!
          </p>
        ) : (
          cartData.map((item) => (
            <div key={item.id} className="bg-[#1f1f1f] rounded-lg px-3 py-2 mb-2">
              <div className="flex items-center justify-between">
                <h1 className="text-[#f5f5f5] font-semibold text-sm flex-1 mr-2">
                  {item.name}
                </h1>
                <p className="text-[#f5f5f5] font-bold text-sm">Rs{item.price}</p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dispatch(decrementItem(item.id))}
                    className="bg-[#343434] text-[#e85d04] p-1 rounded"
                  >
                    <FaMinus size={8} />
                  </button>
                  <span className="text-white text-xs font-bold min-w-[16px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => dispatch(incrementItem(item.id))}
                    className="bg-[#343434] text-[#02ca3a] p-1 rounded"
                  >
                    <FaPlus size={8} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#ababab] text-xs">
                    Rs{item.pricePerQuantity} x {item.quantity}
                  </span>
                  <RiDeleteBin2Fill
                    onClick={() => dispatch(removeItem(item.id))}
                    className="text-red-500 cursor-pointer"
                    size={14}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CartInfo;
