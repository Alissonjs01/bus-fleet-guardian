// Serviço de geração de fingerprint da máquina
// Gera um hash SHA-256 determinístico e estável
// Nunca expõe dados brutos do sistema

/**
 * Coleta componentes do navegador para gerar fingerprint
 */
function collectBrowserComponents(): string[] {
  const components: string[] = [];

  // User Agent
  components.push(navigator.userAgent || 'unknown-ua');

  // Idioma
  components.push(navigator.language || 'unknown-lang');

  // Resolução de tela
  components.push(`${screen.width}x${screen.height}`);

  // Profundidade de cor
  components.push(String(screen.colorDepth || 24));

  // Timezone offset
  components.push(String(new Date().getTimezoneOffset()));

  // Hardware concurrency (número de processadores lógicos)
  components.push(String(navigator.hardwareConcurrency || 4));

  // Plataforma
  components.push(navigator.platform || 'unknown-platform');

  // Device pixel ratio
  components.push(String(window.devicePixelRatio || 1));

  // Disponibilidade de touch
  components.push(String('ontouchstart' in window));

  // WebGL renderer (estável entre sessões)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown-renderer');
      }
    }
  } catch {
    components.push('webgl-unavailable');
  }

  return components;
}

/**
 * Converte ArrayBuffer para string hexadecimal
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gera hash SHA-256 do fingerprint
 * @returns Promise<string> - Hash hexadecimal de 64 caracteres
 */
export async function generateFingerprint(): Promise<string> {
  const components = collectBrowserComponents();
  const fingerprintString = components.join('|');

  // Gera hash SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return arrayBufferToHex(hashBuffer);
}

/**
 * Verifica se o fingerprint atual corresponde ao armazenado
 */
export async function verifyFingerprint(storedHash: string): Promise<boolean> {
  const currentHash = await generateFingerprint();
  return currentHash === storedHash;
}
