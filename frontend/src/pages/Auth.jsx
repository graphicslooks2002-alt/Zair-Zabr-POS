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
    <div className="flex min-h-screen w-full bg-base">
      {/* Left Section — image + quote, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <img className="absolute inset-0 w-full h-full object-cover" src={restaurant} alt="Restaurant" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/60"></div>
        <blockquote className="relative z-10 px-12 max-w-lg text-3xl font-light italic text-white leading-relaxed">
          “Serve customers the best food with prompt and friendly service in a
          welcoming atmosphere, and they’ll keep coming back.”
          <span className="block mt-6 text-accent text-xl not-italic font-semibold">— Zair Zabar</span>
        </blockquote>
      </div>

      {/* Right Section — sign-in card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 min-h-screen">
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl shadow-xl p-6 sm:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="Zair Zabar Logo" className="h-16 w-16 border-2 border-accent rounded-full p-1" />
            <h1 className="text-2xl font-extrabold text-accent tracking-wide">Zair Zabar</h1>
            <p className="text-[10px] text-faint uppercase tracking-[0.3em] -mt-1">Point of Sale</p>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl text-center mt-8 font-bold text-main">
            {isForgot ? "Forgot Password" : "Sign In"}
          </h2>
          <p className="text-center text-muted text-sm mt-1 mb-8">
            {isForgot ? "Reset your account password." : "Sign in to your account to continue."}
          </p>

          {/* Form */}
          {isForgot ? (
            <ForgotPassword onBack={() => setIsForgot(false)} />
          ) : (
            <>
              <Login />
              <div className="text-center mt-5">
                <button onClick={() => setIsForgot(true)} className="text-muted text-sm hover:text-accent hover:underline">
                  Forgot password?
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
