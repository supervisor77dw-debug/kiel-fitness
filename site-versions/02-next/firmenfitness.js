(function () {
  "use strict";

  const attributionKeys = [
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmContent",
    "utmTerm",
    "gclid",
    "fbclid"
  ];

  function createSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("Secure random values are unavailable");
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function getAttribution() {
    const params = new URLSearchParams(window.location.search);
    let referrer = null;
    if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        if (["http:", "https:"].includes(referrerUrl.protocol)) {
          referrer = `${referrerUrl.origin}${referrerUrl.pathname}`.slice(0, 2048);
        }
      } catch (_error) {
        referrer = null;
      }
    }
    const attribution = {
      landingPage: `${window.location.origin}${window.location.pathname}`,
      referrer
    };
    const paramsByField = {
      utmSource: "utm_source",
      utmMedium: "utm_medium",
      utmCampaign: "utm_campaign",
      utmContent: "utm_content",
      utmTerm: "utm_term",
      gclid: "gclid",
      fbclid: "fbclid"
    };

    attributionKeys.forEach((field) => {
      const value = params.get(paramsByField[field]);
      attribution[field] = value ? value.slice(0, 500) : null;
    });
    return attribution;
  }

  function formPayload(form) {
    const values = new FormData(form);
    const payload = {};
    [
      "schemaVersion",
      "requestType",
      "companyName",
      "firstName",
      "lastName",
      "email",
      "phone",
      "location",
      "employeeSize",
      "existingOffer",
      "message",
      "sourcePage",
      "website"
    ].forEach((field) => {
      if (values.has(field)) {
        const value = String(values.get(field));
        payload[field] = field === "message" ? value : value.trim();
      }
    });

    payload.schemaVersion = Number(payload.schemaVersion);
    payload.callbackRequested = values.has("callbackRequested");
    payload.submissionId = createSubmissionId();
    Object.assign(payload, getAttribution());
    return payload;
  }

  document.querySelectorAll("[data-firm-fitness-form]").forEach((form) => {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');
    const callback = form.querySelector('input[name="callbackRequested"]');
    const phone = form.querySelector('input[name="phone"]');
    const initialButtonText = button ? button.textContent : "";

    if (callback && phone) {
      const syncCallbackRequirement = () => {
        phone.required = callback.checked;
      };
      callback.addEventListener("change", syncCallbackRequirement);
      syncCallbackRequirement();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity() || form.dataset.submitting === "true") return;

      form.dataset.submitting = "true";
      if (button) {
        button.disabled = true;
        button.textContent = "Wird geprüft …";
      }
      if (status) {
        status.hidden = false;
        status.textContent = "Deine Eingaben werden geprüft. Diese lokale Vorschau versendet oder speichert keine Anfrage.";
      }

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formPayload(form))
        });
        let result;
        try {
          result = await response.json();
        } catch {
          result = null;
        }
        const confirmed = response.ok && result?.success === true &&
          typeof result.message === "string" && result.message.trim();
        if (confirmed) {
          form.reset();
          if (callback && phone) phone.required = callback.checked;
          if (status) status.textContent = result.message;
        } else if (status) {
          status.textContent = typeof result?.message === "string"
            ? result.message
            : "Die Anfrage konnte nicht bestätigt werden. Deine Eingaben bleiben erhalten. Bitte kontaktiere KIELS telefonisch oder per E-Mail.";
        }
        if (status) status.focus();
      } catch (_error) {
        if (status) {
          status.textContent = "Die Anfrage konnte nicht gesendet werden. Deine Eingaben bleiben erhalten. Bitte kontaktiere KIELS direkt.";
          status.focus();
        }
      } finally {
        form.dataset.submitting = "false";
        if (button) {
          button.disabled = false;
          button.textContent = initialButtonText;
        }
      }
    });
  });

  const copyButton = document.querySelector("[data-copy-recommendation]");
  if (copyButton) {
    const copyStatus = document.querySelector("[data-copy-status]");
    copyButton.addEventListener("click", async () => {
      const message = `${document.querySelector("#recommendation-text").textContent.trim()}\n\n${window.location.href}`;
      try {
        await navigator.clipboard.writeText(message);
        if (copyStatus) {
          copyStatus.hidden = false;
          copyStatus.textContent = "Text und aktueller Seitenlink wurden kopiert. In der lokalen Vorschau ist der Link nicht öffentlich erreichbar.";
        }
      } catch (_error) {
        if (copyStatus) {
          copyStatus.hidden = false;
          copyStatus.textContent = "Kopieren ist in diesem Browser nicht verfügbar. Bitte markiere den Text und kopiere ihn manuell.";
        }
      }
    });
  }
})();
