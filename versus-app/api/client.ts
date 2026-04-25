"use strict";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthService } from "./auth-service";
import { router } from "expo-router";

const _URL = process.env.EXPO_PUBLIC_LOCAL_URL ?? ""  // IP portatile dove si trova il server (se client e server sulla stessa rete) | indirizzo ngrok pubblico per connettersi al server locale
export async function inviaRichiesta(method: any, url: any = "", params: any = {}) {
    method = method.toUpperCase()
    url = "/api" + url;
    const TOKEN_JWT = await AuthService.getToken(); //metodo static

    let options: any = {
        "method": method,
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            ...(TOKEN_JWT ? { "Authorization": `Bearer ${TOKEN_JWT}` } : {}),
        },
        "mode": "cors",                  // default
        "cache": "no-cache",             // default
        "credentials": "omit",    // default
        "redirect": "follow",            // default
        "referrerPolicy": "no-referrer", // default no-referrer-when-downgrade
    }

    if (method == "GET" || method == "DELETE") {
        options.headers["Content-Type"] = "application/x-www-form-urlencoded"
        const queryParams = new URLSearchParams();
        for (let key in params) {
            let value = params[key];
            // Notare che i parametri di tipo object vengono serializzati
            if (value && typeof value === "object")
                queryParams.append(key, JSON.stringify(value));
            else
                queryParams.append(key, value);
        }
        if (url.includes("?"))
            url += "&"
        else
            url += "?"
        url += queryParams.toString()
    }
    else {
        if (params instanceof FormData) {
            // In caso di formData occorre OMETTERE il Content-Type !
            // options.headers["Content-Type"]="multipart/form-data;" 
            options["body"] = params     // Accept FormData, File, Blob			
        }
        else {
            options["body"] = JSON.stringify(params)
            options.headers["Content-Type"] = "application/json";
        }
    }

    // try {
    // 	const response = await fetch(_URL + url, options)
    // 	if (!response.ok) {
    // 		let err = await response.text()
    // 		return { "status": response.status, err }
    // 	}
    // 	else {
    // 		let data = await response.json().catch(function (err) {
    // 			console.log(err)
    // 			return { "status": 422, "err": "Response contains an invalid json" }
    // 		})
    // 		return { "status": 200, data }
    // 	}
    // }
    // catch {
    // 	return { "status": 408, "err": "Connection Refused or Server timeout" }
    // }

    try {
        const response = await fetch(_URL + url, options);
        //leggo il body della risposta come semplice testo
        const text = await response.text();
        if (response.status === 401) {
           //elimino i dati di sessione e rimando al login
            await AuthService.logout();
            router.replace("/login"); // ← rimanda al login
            return;
        }
        if (!response.ok) {
            return { status: response.status, err: text }
        }

        if (text) {
            //no errore
            try {
                const data = JSON.parse(text);
                return { status: response.status, data }
            }
            catch (err) {
                return { status: 422, err: "Invalid JSON" }
            }
        }
    }
    catch (err) {
        return { status: 408, err: "Connection refused or server timed out" }
    }
}