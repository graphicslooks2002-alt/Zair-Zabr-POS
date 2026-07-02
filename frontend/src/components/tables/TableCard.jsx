import React from "react";
import { useNavigate } from "react-router-dom";
import { getAvatarName, getBgColor } from "../../utils"
import { FaLongArrowAltRight } from "react-icons/fa";

const TableCard = ({id, name, status, initials, seats}) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if(status === "Booked") return;
    // Open the new Create Order page with this table pre-selected (Dine In).
    navigate("/orders/new", { state: { table: { tableId: id, tableNo: name } } });
  };

  return (
    <div onClick={handleClick} className="w-full hover:bg-[#2c2c2c] bg-[#262626] p-4 rounded-lg cursor-pointer">
      <div className="flex items-center justify-between gap-2 px-1">
        <h1 className="text-[#f5f5f5] text-base sm:text-lg font-semibold flex items-center gap-1 min-w-0">
          <span className="truncate">Table</span>
          <FaLongArrowAltRight className="text-[#ababab] shrink-0" />
          <span>{name}</span>
        </h1>
        <p className={`${status === "Booked" ? "text-[#f6b100] bg-[#664a04]" : "text-green-600 bg-[#2e4a40]"} px-2 py-1 rounded-lg text-xs shrink-0 whitespace-nowrap`}>
          {status}
        </p>
      </div>
      <div className="flex items-center justify-center mt-5 mb-8">
        <h1 className={`text-white rounded-full p-5 text-xl`} style={{backgroundColor : initials ? getBgColor(id) : "#1f1f1f"}} >{getAvatarName(initials) || "N/A"}</h1>
      </div>
      <p className="text-[#ababab] text-xs">Seats: <span className="text-[#f5f5f5]">{seats}</span></p>
    </div>
  );
};

export default TableCard;
