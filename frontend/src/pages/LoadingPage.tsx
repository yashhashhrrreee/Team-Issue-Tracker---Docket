import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { me } from "../api/auth";

// DesignBrief.md: "should feel like a stamp settling," not a spinner —
// the mark scales in from small, then hands off to Login or Projects.
export function LoadingPage() {
  const navigate = useNavigate();
  const { data, isFetched } = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

  useEffect(() => {
    if (!isFetched) return;
    const timeout = setTimeout(() => {
      navigate(data ? "/projects" : "/login", { replace: true });
    }, 650);
    return () => clearTimeout(timeout);
  }, [isFetched, data, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.9 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="font-mono text-[13px] uppercase tracking-[0.24em] text-ink sm:text-[15px]"
      >
        Docket
      </motion.span>
    </div>
  );
}
