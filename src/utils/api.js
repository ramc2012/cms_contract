const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function apiFetch(path, options = {}, token = "") {
    const isFormData = options.body instanceof FormData;
    const headers = { ...options.headers };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // If using FormData, DO NOT set Content-Type header.
    // The browser will automatically set it to multipart/form-data with the correct boundary.
    if (!isFormData && options.body && typeof options.body === "object") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    // Handle No Content
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType && contentType.includes("application/json");

    // If Not OK, attempt to parse error message
    if (!response.ok) {
        if (response.status === 401) {
            // Typically handled by AuthContext, but throwing specific error allows catch block interception
            throw new Error("Unauthorized");
        }

        let errorMessage = `HTTP Error ${response.status}`;
        if (isJson) {
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // ignore JSON parse error on error response
            }
        } else {
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch (e) {
                // ignore text parse error
            }
        }
        throw new Error(errorMessage);
    }

    // Handle success but no JSON (e.g., file downloads)
    if (!isJson) {
        return response.blob();
    }

    return response.json();
}
