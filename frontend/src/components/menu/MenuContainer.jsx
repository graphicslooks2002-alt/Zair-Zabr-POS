import React, { useState } from "react";
import { menus } from "../../constants";
import { GrRadialSelected } from "react-icons/gr";
import { FaPlus, FaMinus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { addItems } from "../../redux/slices/cartSlice";

const MenuContainer = () => {
  const [selected, setSelected] = useState(menus[0]);
  const dispatch = useDispatch();
  const cartData = useSelector((state) => state.cart);

  const getCartQuantity = (name) => {
    const item = cartData.find((i) => i.name === name);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (item) => {
    const { name, price } = item;
    dispatch(
      addItems({
        name,
        pricePerQuantity: price,
        quantity: 1,
        price: price,
      })
    );
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-3 px-10 py-4 w-[100%]">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="flex flex-col items-start justify-between p-3 rounded-lg h-[70px] cursor-pointer"
            style={{ backgroundColor: menu.bgColor }}
            onClick={() => setSelected(menu)}
          >
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[#f5f5f5] text-md font-semibold">
                {menu.icon} {menu.name}
              </h1>
              {selected.id === menu.id && (
                <GrRadialSelected className="text-white" size={18} />
              )}
            </div>
            <p className="text-[#ababab] text-xs font-semibold">
              {menu.items.length} Items
            </p>
          </div>
        ))}
      </div>

      <hr className="border-[#2a2a2a] border-t-2 mt-2" />

      <div className="grid grid-cols-4 gap-4 px-10 py-4 w-[100%]">
        {selected?.items.map((item) => {
          const qty = getCartQuantity(item.name);
          return (
            <div
              key={item.id}
              className={`flex flex-col items-start justify-between p-4 rounded-lg h-[120px] cursor-pointer transition-colors ${
                qty > 0
                  ? "bg-[#2e4a40] border border-[#02ca3a]"
                  : "bg-[#1a1a1a] hover:bg-[#2a2a2a]"
              }`}
              onClick={() => handleAddToCart(item)}
            >
              <div className="flex items-start justify-between w-full">
                <h1 className="text-[#f5f5f5] text-md font-semibold leading-tight">
                  {item.name}
                </h1>
                {qty > 0 && (
                  <span className="bg-[#02ca3a] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                    {qty}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between w-full">
                <p className="text-[#e85d04] text-lg font-bold">
                  Rs{item.price}
                </p>
                <div className="flex items-center gap-1">
                  <FaPlus className="text-[#02ca3a]" size={14} />
                  <span className="text-[#ababab] text-xs">Tap to add</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MenuContainer;
