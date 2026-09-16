import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface ResolveModalProps {
  open: boolean;
  ticketLabel: string;
  isSubmitting: boolean;
  onSubmit: (resolutionNote: string) => void;
  onCancel: () => void;
}

// Backend.md §5 rule 2: moving to Done requires a resolution note.
// Enforced server-side too — this is the UI half of that rule.
export function ResolveModal({
  open,
  ticketLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: ResolveModalProps) {
  const [note, setNote] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-10 flex items-center justify-center bg-ink/50 px-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[480px] border-2 border-ink bg-paper-raised px-6 py-8 sm:px-10 sm:pt-10 sm:pb-9"
          >
            <div className="mb-2 font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
              {ticketLabel} · Moving to Done
            </div>
            <h2 className="mb-2.5 font-heading text-xl font-semibold text-ink sm:text-2xl">
              What fixed this?
            </h2>
            <p className="mb-5 font-body text-[13px] leading-[1.5] text-ink-soft sm:mb-6 sm:text-sm">
              This note gets pulled into Solved Issues so the next person who hits something like
              this can find it. Worth a real sentence, not "fixed."
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="What fixed this, and would it help next time?"
              className="w-full resize-none border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-sm text-ink outline-none focus:border-ink sm:text-[15px]"
            />

            <button
              disabled={!note.trim() || isSubmitting}
              onClick={() => onSubmit(note)}
              className="mt-[22px] w-full bg-ink py-[13px] font-body text-[15px] font-semibold text-paper hover:bg-[#15213A] disabled:opacity-60 sm:mt-7"
            >
              {isSubmitting ? "Marking as Done…" : "Mark as Done"}
            </button>

            <div className="mt-3.5 text-center sm:mt-4">
              <button
                onClick={onCancel}
                className="font-body text-[13px] text-ink-soft hover:underline sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
