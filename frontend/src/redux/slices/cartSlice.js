import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItems: (state, action) => {
            const existing = state.find(item => item.name === action.payload.name);
            if (existing) {
                existing.quantity += action.payload.quantity;
                existing.price = existing.quantity * existing.pricePerQuantity;
            } else {
                state.push({ ...action.payload, id: Date.now() + Math.random() });
            }
        },

        incrementItem: (state, action) => {
            const item = state.find(item => item.id === action.payload);
            if (item) {
                item.quantity += 1;
                item.price = item.quantity * item.pricePerQuantity;
            }
        },

        decrementItem: (state, action) => {
            const item = state.find(item => item.id === action.payload);
            if (item && item.quantity > 1) {
                item.quantity -= 1;
                item.price = item.quantity * item.pricePerQuantity;
            } else {
                return state.filter(item => item.id !== action.payload);
            }
        },

        removeItem: (state, action) => {
            return state.filter(item => item.id !== action.payload);
        },

        removeAllItems: () => {
            return [];
        }
    }
});

export const getTotalPrice = (state) => state.cart.reduce((total, item) => total + item.price, 0);
export const getTotalItems = (state) => state.cart.reduce((total, item) => total + item.quantity, 0);
export const { addItems, incrementItem, decrementItem, removeItem, removeAllItems } = cartSlice.actions;
export default cartSlice.reducer;
