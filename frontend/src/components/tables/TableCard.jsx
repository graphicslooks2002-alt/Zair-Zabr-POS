import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getAvatarName, getBgColor } from "../../utils"
import { FaLongArrowAltRight, FaPen, FaMinus, FaPlus } from "react-icons/fa";
import { updateTableSeats } from "../../https";

const TableCard = ({id, name, status, initials, seats}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useSelector((state) => state.user);
  const isSuperadmin = role === "Superadmin";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seats);

  const seatsMutation = useMutation({
    mutationFn: (value) => updateTableSeats(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      enqueueSnackbar("Seats updated!", { variant: "success" });
      setEditing(false);
    },
    onError: (err) => {
      enqueueSnackbar(err?.response?.data?.message || "Failed to update seats!", { variant: "error" });
    },
  });

  const handleClick = () => {
    if (editing) return;              // don't open booking while editing seats
    if(status === "Booked") return;
    // Open the new Create Order page with this table pre-selected (Dine In).
    navigate("/orders/new", { state: { table: { tableId: id, tableNo: name } } });
  };

  const stop = (e) => e.stopPropagation();
  const openEditor = (e) => { stop(e); setDraft(seats); setEditing(true); };
  const dec = (e) => { stop(e); setDraft((n) => Math.max(1, Number(n) - 1)); };
  const inc = (e) => { stop(e); setDraft((n) => Number(n) + 1); };
  const save = (e) => {
    stop(e);
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) {
      enqueueSnackbar("Seats must be a positive whole number.", { variant: "warning" });
      return;
    }
    if (value === seats) { setEditing(false); return; }
    seatsMutation.mutate(value);
  };
  const cancel = (e) => { stop(e); setEditing(false); };

  return (
    <div onClick={handleClick} className="relative w-full hover:bg-hover bg-surface p-4 rounded-lg cursor-pointer">
      <div className="flex items-center justify-between gap-2 px-1">
        <h1 className="text-main text-base sm:text-lg font-semibold flex items-center gap-1 min-w-0">
          <span className="truncate">Table</span>
          <FaLongArrowAltRight className="text-muted shrink-0" />
          <span>{name}</span>
        </h1>
        <p className={`${status === "Booked" ? "text-warn bg-[#664a04]" : "text-green-600 bg-[#2e4a40]"} px-2 py-1 rounded-lg text-xs shrink-0 whitespace-nowrap`}>
          {status}
        </p>
      </div>
      <div className="flex items-center justify-center mt-5 mb-8">
        <h1 className={`rounded-full p-5 text-xl ${initials ? "text-white" : "text-muted"}`} style={{backgroundColor : initials ? getBgColor(id) : "var(--c-panel)"}} >{getAvatarName(initials) || "N/A"}</h1>
      </div>

      {/* Footer stays rendered so the card height never changes. */}
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs">Seats: <span className="text-main">{seats}</span></p>
        {isSuperadmin && !editing && (
          <button onClick={openEditor} title="Edit seats" className="text-muted hover:text-accent p-1">
            <FaPen size={12} />
          </button>
        )}
      </div>

      {editing && (
        // Seat editor floats over the card bottom — no layout reflow.
        <div onClick={stop} className="absolute left-0 right-0 bottom-0 bg-hover rounded-b-lg p-3 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <button onClick={dec} className="bg-base text-main w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated shrink-0"><FaMinus size={10} /></button>
            <input
              type="number"
              min={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stop}
              className="w-12 bg-base text-main text-center rounded-lg py-1 text-sm outline-none"
            />
            <button onClick={inc} className="bg-base text-main w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated shrink-0"><FaPlus size={10} /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="flex-1 text-muted text-xs py-1.5 rounded-lg bg-base hover:bg-elevated">Cancel</button>
            <button onClick={save} disabled={seatsMutation.isPending} className="flex-1 bg-accent text-white text-xs py-1.5 rounded-lg font-semibold disabled:opacity-50">
              {seatsMutation.isPending ? "…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCard;
