import "core-js/stable";
import { installNetworkPolicy } from "./network-policy.mjs";

installNetworkPolicy();

import("./main.tsx")
  .then(({ main }) => main())
  .catch((error: unknown) => {
    console.error(error);
    const root = document.getElementById("desktop-root");
    if (root) {
      root.replaceChildren();
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = `Keybr Desktop could not start: ${String(error)}. Your saved progress has not been cleared.`;
      root.append(message);
    }
  });
