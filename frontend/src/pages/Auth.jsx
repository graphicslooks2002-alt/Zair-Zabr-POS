import React, { useEffect, useState } from "react";
import restaurant from "../assets/images/restaurant-img.jpg"
import logo from "../assets/images/logo.png"
import Login from "../components/auth/Login";
import ForgotPassword from "../components/auth/ForgotPassword";

const Auth = () => {

  useEffect(() => {
    document.title = "Zair Zabar POS | Auth"
  }, [])

  // Sign-in only. Staff accounts are created by an admin/owner in Manage Staff —
  // there is no public sign-up.
  const [isForgot, setIsForgot] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Section */}
      <div className="w-1/2 relative flex items-center justify-center bg-cover">
        {/* BG Image */}
        <img className="w-full h-full object-cover" src={restaurant} alt="Restaurant Image" />

        {/* Black Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-80"></div>

        {/* Quote at bottom */}
        <blockquote className="absolute bottom-10 px-8 mb-10 text-2xl italic text-white">
          "Serve customers the best food with prompt and friendly service in a
          welcoming atmosphere, and they’ll keep coming back."
          <br />
          <span className="block mt-4 text-[#e85d04]">- Zair Zabar</span>
        </blockquote>
      </div>

      {/* Right Section */}
      <div className="w-1/2 min-h-screen bg-[#1a1a1a] p-10">
        <div className="flex flex-col items-center gap-2">
          <img src={logo} alt="Zair Zabar Logo" className="h-14 w-14 border-2 border-[#e85d04] rounded-full p-1" />
          <h1 className="text-xl font-bold text-[#e85d04] tracking-wide">Zair Zabar</h1>
        </div>

        <h2 className="text-4xl text-center mt-10 font-semibold text-[#e85d04] mb-10">
          {isForgot ? "Forgot Password" : "Employee Login"}
        </h2>

        {/* Components */}
        {isForgot ? (
          <ForgotPassword onBack={() => setIsForgot(false)} />
        ) : (
          <>
            <Login />
            <div className="text-center mt-4">
              <button onClick={() => setIsForgot(true)} className="text-[#ababab] text-sm hover:text-[#e85d04] hover:underline">
                Forgot password?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
