# Si desaparezco, usen esta foto

**Repositorio preventivo de identidad.** Un ejercicio de soberanía radical sobre el rastro propio frente a la crisis forense contemporánea.

## Resumen Conceptual
¿Cómo se habita la posibilidad de la propia ausencia? Esta pieza es una plataforma web y un ejercicio de realismo traumático que confronta la fragilidad de nuestra presencia. La mayoría de las fichas de búsqueda actuales utilizan imágenes precarias de baja calidad. Esta obra permite al usuario realizar un ritual de auto-archivo para generar una infraestructura de datos lista para ser activada por sus seres queridos, convirtiendo el miedo en un gesto de cuidado extremo.

## Especificaciones Técnicas
Esta aplicación opera bajo una arquitectura de conocimiento cero (Zero-Knowledge).
* **Cifrado Local:** Los datos se cifran exclusivamente en el navegador del usuario utilizando AES-256-GCM.
* **Derivación de Clave:** Se utiliza PBKDF2 con 600,000 iteraciones (recomendación OWASP) para transformar la contraseña en una llave criptográfica.
* **Sin Servidores:** No existe base de datos central ni transmisión de información personal a servidores externos; el usuario resguarda físicamente su archivo .sidf.
* **Privacidad Total:** El sistema no utiliza cookies, rastreadores ni analíticas de ningún tipo.

## Funcionalidades
* **Captura Biométrica:** Interfaz para capturar retratos de alta fidelidad y fotografías de cuerpo completo.
* **Registro de Señas:** Documentación detallada de tatuajes, cicatrices y rasgos físicos específicos.
* **Llave Delegada:** Generación de un archivo cifrado cuya llave de acceso pertenece exclusivamente al usuario para ser entregada a personas de confianza.
* **Generador de Fichas:** Módulo de descifrado que genera instantáneamente un boletín de búsqueda digno y funcional.

## Instalación
Al ser una pieza de media art basada en web, no requiere dependencias de servidor.
1. Clona el repositorio.
2. Abre index.html en un navegador moderno que soporte Web Crypto API.

## Licencia
Este proyecto está bajo la licencia MIT. Eres libre de usar, modificar y distribuir este código siempre que se mantenga el crédito al autor original y el propósito ético de la pieza.

---
**Manuel Mendoza — 2026**
*Tecnología para preservar, no para vigilar*.
