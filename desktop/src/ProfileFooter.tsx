import { useResults } from "@keybr/result";
import { useState } from "react";
import { Link } from "react-router";

export function ProfileFooter() {
  const { clearResults } = useResults();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="desktop-about">
      <Link to="/backup">Back up or restore your typing history</Link>
      {confirm ? (
        <div className="desktop-import-preview" role="alert">
          <p>
            Permanently delete all typing history on this device? Export a
            backup first if you want to keep a copy. Lesson settings will stay
            as they are.
          </p>
          <div className="desktop-actions">
            <button
              onClick={() => {
                clearResults();
                setConfirm(false);
              }}
            >
              Delete typing history
            </button>
            <button onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="desktop-actions">
          <button onClick={() => setConfirm(true)}>Reset statistics…</button>
        </div>
      )}
    </div>
  );
}
