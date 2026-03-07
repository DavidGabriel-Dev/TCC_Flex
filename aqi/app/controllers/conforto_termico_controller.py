from typing import Dict, Any

class ConfortoTermicoController:

    LIMITES = {
        "temperatura": {"min": 20, "max": 26},
        "umidade": {"min": 40, "max": 65},
        "co2": {"max": 1000},
        "tvoc": {"max": 500}      
    }
    
    def avaliar(self, dados: Dict[str, float]) -> Dict[str, Any]:
        avaliacoes = {}

        
        temp = dados.get("temperatura")
        if temp is not None:
            limites = self.LIMITES["temperatura"]
            status = "OK" if limites["min"] <= temp <= limites["max"] else "FORA_DO_PADRAO"
            avaliacoes["temperatura"] = {
                "valor": temp,
                "status": status,
                "limite_min": limites["min"],
                "limite_max": limites["max"]
            }


        umid = dados.get("umidade")
        if umid is not None:
            limites = self.LIMITES["umidade"]
            status = "OK" if limites["min"] <= umid <= limites["max"] else "FORA_DO_PADRAO"
            avaliacoes["umidade"] = {
                "valor": umid,
                "status": status,
                "limite_min": limites["min"],
                "limite_max": limites["max"]
            }

        
        co2 = dados.get("co2")
        if co2 is not None:
            limite = self.LIMITES["co2"]["max"]
            if co2 <= limite:
                status = "OK"
            elif co2 <= 1200:
                status = "ALERTA"
            else:
                status = "FORA_DO_PADRAO"
            avaliacoes["co2"] = {
                "valor": co2,
                "status": status,
                "limite_max": limite
            }

        
        tvoc = dados.get("tvoc")
        if tvoc is not None:
            limite = self.LIMITES["tvoc"]["max"]
            status = "OK" if tvoc <= limite else "FORA_DO_PADRAO"
            avaliacoes["tvoc"] = {
                "valor": tvoc,
                "status": status,
                "limite_max": limite
            }

        
        aqi_bruto = dados.get("aqi")
        
        if aqi_bruto is not None:
            aqi_valor = int(aqi_bruto)
        else:
            valor_co2_ref = co2 if co2 is not None else 400
            if valor_co2_ref <= 600: aqi_valor = 1
            elif valor_co2_ref <= 1000: aqi_valor = 2
            elif valor_co2_ref <= 1500: aqi_valor = 3
            else: aqi_valor = 4

        avaliacoes["aqi"] = {
            "valor": aqi_valor,
            "status": "OK" if aqi_valor <= 2 else ("ALERTA" if aqi_valor <= 3 else "FORA_DO_PADRAO")
        }

        conformidade = all(
            item["status"] == "OK"
            for item in avaliacoes.values()
        )

        return {
            "conformidade_anvisa": conformidade,
            "avaliacoes": avaliacoes
        }