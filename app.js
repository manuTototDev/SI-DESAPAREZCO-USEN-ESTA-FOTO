/* ═══════════════════════════════════════════════════════════════
   APP.JS — Application Logic
   SI DESAPAREZCO, USEN ESTA FOTO
   
   Handles: Navigation, Camera, Form Data, Encryption Flow,
   Decryption, Ficha Generation
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── STATE ──────────────────────────────────────────────────────
let state = {
    currentScreen: 'screen-landing',
    capturedImage: null,        // base64 data URL
    capturedImageBlob: null,    // raw blob for quality
    formData: null,
    encryptedBlob: null,        // final encrypted file
    encryptedFileName: null,
    decryptedData: null,        // data from decrypted file
    cameraStream: null,
    markPhotos: {               // photos of tattoos, scars, marks
        tattoo: [],
        scar: [],
        marks: []
    },
    bodyPhoto: null,            // full body photo base64
    markCameraStream: null,     // camera stream for mark photos
    markCameraCategory: null    // current category being captured
};

// ── NAVIGATION ─────────────────────────────────────────────────

/**
 * Navigate between screens with smooth transition
 */
function navigateTo(screenId) {
    const currentScreen = document.querySelector('.screen.active');
    const targetScreen = document.getElementById(screenId);

    if (!targetScreen || currentScreen === targetScreen) return;

    // Fade out current
    if (currentScreen) {
        currentScreen.style.opacity = '0';
        currentScreen.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            currentScreen.classList.remove('active');
            currentScreen.style.display = 'none';
            
            // Show target
            targetScreen.style.display = 'block';
            targetScreen.style.opacity = '0';
            targetScreen.style.transform = 'translateY(20px)';
            
            // Force reflow
            targetScreen.offsetHeight;
            
            targetScreen.classList.add('active');
            targetScreen.style.opacity = '1';
            targetScreen.style.transform = 'translateY(0)';
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            state.currentScreen = screenId;
            
            // Screen-specific initialization
            onScreenEnter(screenId);
        }, 300);
    }

}

/**
 * Called when entering a screen — setup logic
 */
function onScreenEnter(screenId) {
    switch (screenId) {
        case 'screen-capture':
            initCamera();
            break;
        case 'screen-data':
            // Restore form data if exists
            break;
        case 'screen-encrypt':
            // Reset password fields
            break;
    }
}

// ── CAMERA ─────────────────────────────────────────────────────

/**
 * Initialize camera feed
 */
async function initCamera() {
    const video = document.getElementById('camera-feed');
    const statusEl = document.getElementById('camera-status');
    const captureBtn = document.getElementById('btn-capture');
    const preview = document.getElementById('captured-preview');

    // If already captured, don't re-init
    if (state.capturedImage && preview.style.display !== 'none') {
        return;
    }

    try {
        // Request camera access — prefer rear camera on mobile
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 2560 },
                aspectRatio: { ideal: 3/4 }
            }
        });

        state.cameraStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';

        statusEl.textContent = 'CÁMARA ACTIVA';
        statusEl.style.color = '#6b9e3c';
        captureBtn.disabled = false;

    } catch (err) {
        console.error('Camera error:', err);
        statusEl.textContent = 'NO SE PUDO ACCEDER A LA CÁMARA';
        statusEl.style.color = '#c42b2b';

        // Show upload as primary option
        document.getElementById('btn-upload').style.display = 'inline-flex';
    }
}

/**
 * Stop camera stream
 */
function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
}

/**
 * Capture photo from camera feed
 */
function capturePhoto() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    const preview = document.getElementById('captured-preview');
    const faceGuide = document.querySelector('.face-guide');
    const retakeBtn = document.getElementById('btn-retake');
    const captureBtn = document.getElementById('btn-capture');
    const continueBtn = document.getElementById('btn-to-data');
    const statusEl = document.getElementById('camera-status');

    // Set canvas to video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    
    // Mirror the image (camera is mirrored via CSS)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset

    // Get high-quality image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    state.capturedImage = dataUrl;

    // Show preview
    preview.src = dataUrl;
    preview.style.display = 'block';
    video.style.display = 'none';
    faceGuide.style.display = 'none';
    statusEl.textContent = 'RETRATO CAPTURADO';

    // Toggle buttons
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-flex';
    continueBtn.disabled = false;

    // Stop camera to save resources
    stopCamera();
}

/**
 * Retake photo
 */
function retakePhoto() {
    const video = document.getElementById('camera-feed');
    const preview = document.getElementById('captured-preview');
    const faceGuide = document.querySelector('.face-guide');
    const retakeBtn = document.getElementById('btn-retake');
    const captureBtn = document.getElementById('btn-capture');
    const continueBtn = document.getElementById('btn-to-data');

    state.capturedImage = null;
    preview.style.display = 'none';
    video.style.display = 'block';
    faceGuide.style.display = 'flex';

    captureBtn.style.display = 'flex';
    retakeBtn.style.display = 'none';
    continueBtn.disabled = true;

    // Re-init camera
    initCamera();
}

/**
 * Trigger file upload dialog
 */
function triggerUpload() {
    document.getElementById('file-upload').click();
}

/**
 * Handle uploaded file
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        state.capturedImage = dataUrl;

        const preview = document.getElementById('captured-preview');
        const video = document.getElementById('camera-feed');
        const faceGuide = document.querySelector('.face-guide');
        const retakeBtn = document.getElementById('btn-retake');
        const captureBtn = document.getElementById('btn-capture');
        const continueBtn = document.getElementById('btn-to-data');
        const statusEl = document.getElementById('camera-status');

        preview.src = dataUrl;
        preview.style.display = 'block';
        video.style.display = 'none';
        faceGuide.style.display = 'none';
        statusEl.textContent = 'IMAGEN CARGADA';

        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        continueBtn.disabled = false;

        stopCamera();
    };
    reader.readAsDataURL(file);
}

// ── MARK PHOTOS (Tattoos / Scars / Other marks) ────────────────

/**
 * Handle photo uploads for identifying marks
 */
function handleMarkPhotos(event, category) {
    const files = event.target.files;
    if (!files.length) return;

    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            state.markPhotos[category].push(dataUrl);
            renderMarkPreviews(category);
        };
        reader.readAsDataURL(file);
    }

    // Reset input so same file can be re-selected
    event.target.value = '';
}

/**
 * Render preview thumbnails for mark photos
 */
function renderMarkPreviews(category) {
    const container = document.getElementById(`${category}-previews`);
    if (!container) return;

    container.innerHTML = '';
    state.markPhotos[category].forEach((dataUrl, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'mark-photo-thumb';
        thumb.innerHTML = `
            <img src="${dataUrl}" alt="Seña ${index + 1}">
            <button class="mark-photo-remove" onclick="removeMarkPhoto('${category}', ${index})" title="Eliminar">×</button>
        `;
        container.appendChild(thumb);
    });
}

/**
 * Remove a mark photo by index
 */
function removeMarkPhoto(category, index) {
    state.markPhotos[category].splice(index, 1);
    renderMarkPreviews(category);
}

// ── TERMS & CONDITIONS / PRIVACY ──────────────────────────

function toggleBeginButton() {
    const checkbox = document.getElementById('accept-terms');
    const btn = document.getElementById('btn-begin');
    btn.disabled = !checkbox.checked;
}

function openPrivacyModal() {
    document.getElementById('privacy-modal').style.display = 'flex';
}

function closePrivacyModal() {
    document.getElementById('privacy-modal').style.display = 'none';
}

// ── ARTIST FICHA — Interactive Password Challenge ─────────────

const ARTIST_FILE = 'Manuel_Alejandro_Mendoza_Valencia_1775700771009.sidf';
const ARTIST_PASSWORD = 'Ficha2626$1';
let artistAttempts = 0;
let artistFileBuffer = null;
let artistDecrypted = false;

/**
 * Pre-fetch the artist .sidf file so it's ready when needed
 */
async function prefetchArtistFile() {
    try {
        const response = await fetch(ARTIST_FILE);
        if (!response.ok) return;
        artistFileBuffer = await response.arrayBuffer();
    } catch (e) {
        console.warn('Could not prefetch artist file:', e);
    }
}

/**
 * Open the artist modal
 */
function openArtistModal() {
    const modal = document.getElementById('artist-modal');
    modal.style.display = 'flex';

    // Reset UI if not already decrypted
    if (!artistDecrypted) {
        artistAttempts = 0;
        document.getElementById('artist-password').value = '';
        document.getElementById('artist-error').style.display = 'none';
        document.getElementById('artist-reveal').style.display = 'none';
        document.getElementById('artist-attempts').textContent = '';
        document.getElementById('artist-challenge').style.display = 'block';
        document.getElementById('artist-ficha-result').style.display = 'none';
    }

    // Pre-fetch if not done yet
    if (!artistFileBuffer) prefetchArtistFile();
}

/**
 * Close the artist modal
 */
function closeArtistModal() {
    document.getElementById('artist-modal').style.display = 'none';
}

/**
 * Try to decrypt the artist file with the entered password
 */
async function tryArtistPassword() {
    const passwordInput = document.getElementById('artist-password');
    const errorEl = document.getElementById('artist-error');
    const attemptsEl = document.getElementById('artist-attempts');
    const revealEl = document.getElementById('artist-reveal');
    const password = passwordInput.value.trim();

    if (!password) {
        errorEl.textContent = 'Ingresa una contraseña';
        errorEl.style.display = 'block';
        return;
    }

    if (!artistFileBuffer) {
        errorEl.textContent = 'No se pudo cargar el archivo del artista. Recarga la página.';
        errorEl.style.display = 'block';
        return;
    }

    errorEl.style.display = 'none';

    // Show processing overlay
    const overlay = document.getElementById('processing-overlay');
    const progressText = document.getElementById('processing-text');
    const progressFill = document.getElementById('processing-fill');
    overlay.style.display = 'flex';
    progressText.textContent = 'DESCIFRANDO ARCHIVO...';

    try {
        const data = await CryptoModule.decrypt(
            artistFileBuffer,
            password,
            (progress) => {
                progressFill.style.width = `${progress}%`;
            }
        );

        // Success!
        overlay.style.display = 'none';
        progressFill.style.width = '0%';
        artistDecrypted = true;

        // Hide challenge, show ficha
        document.getElementById('artist-challenge').style.display = 'none';
        renderArtistFichaInModal(data);

    } catch (error) {
        overlay.style.display = 'none';
        progressFill.style.width = '0%';

        artistAttempts++;
        const remaining = 3 - artistAttempts;

        if (remaining > 0) {
            errorEl.textContent = `Contraseña incorrecta. Te quedan ${remaining} intento${remaining > 1 ? 's' : ''}.`;
            errorEl.style.display = 'block';
            attemptsEl.textContent = `${artistAttempts}/3`;
        } else {
            // Reveal the password after 3 failed attempts
            errorEl.textContent = 'Contraseña incorrecta.';
            errorEl.style.display = 'block';
            attemptsEl.textContent = '3/3';

            revealEl.style.display = 'block';
            document.getElementById('artist-password-value').textContent = ARTIST_PASSWORD;
        }

        passwordInput.value = '';
        passwordInput.focus();
    }
}

/**
 * Render the decrypted artist data as a full ficha inside the modal
 */
function renderArtistFichaInModal(data) {
    const resultEl = document.getElementById('artist-ficha-result');
    const cardEl = document.getElementById('artist-ficha-card');
    const d = data.datos;

    resultEl.style.display = 'block';

    // Build the ficha card HTML
    let photoHTML = '';
    if (data.foto) {
        photoHTML = `<img src="${data.foto}" class="ficha-photo" alt="Fotografía" style="display:block;">`;
    } else {
        photoHTML = `<div class="ficha-photo-placeholder" style="display:flex;">
            <div class="placeholder-x"></div>
            <div class="placeholder-circle"><span>SIN FOTO</span><span class="placeholder-sub">DISPONIBLE</span></div>
        </div>`;
    }

    // Build main data fields
    function fieldHTML(label, value) {
        if (!value) return '';
        return `<div class="ficha-field"><div class="ficha-field-label">${label}</div><div class="ficha-field-value">${value}</div></div>`;
    }

    const mainFields = [
        fieldHTML('EDAD', d.edad ? `${d.edad} años` : ''),
        fieldHTML('F. NACIMIENTO', d.fechaNacimiento),
        fieldHTML('UBICACIÓN', d.ubicacion),
        fieldHTML('NOTAS', d.notas),
    ].join('');

    const physicalFields = [
        fieldHTML('ESTATURA', d.estatura ? `${d.estatura} cm` : ''),
        fieldHTML('PESO', d.peso ? `${d.peso} kg` : ''),
        fieldHTML('COMPLEXIÓN', d.complexion),
        fieldHTML('TEZ', d.tez),
        fieldHTML('CABELLO', d.cabello),
        fieldHTML('OJOS', d.ojos),
    ].join('');

    // Marks
    let marksHTML = '';
    const markItems = [
        { label: 'TATUAJES', value: d.tatuajes },
        { label: 'CICATRICES', value: d.cicatrices },
        { label: 'OTRAS SEÑAS', value: d.otrasSenas },
    ];
    let hasMarks = false;
    for (const item of markItems) {
        if (item.value) {
            hasMarks = true;
            marksHTML += `<h4>${item.label}</h4><p>${item.value}</p>`;
        }
    }
    if (!hasMarks) {
        marksHTML = '<p class="marks-empty">Sin señas particulares registradas</p>';
    }

    // Mark photos
    let markPhotosHTML = '';
    if (data.fotosSenas) {
        const cats = [
            { key: 'tattoo', label: 'TATUAJES' },
            { key: 'scar', label: 'CICATRICES' },
            { key: 'marks', label: 'SEÑAS PARTICULARES' }
        ];
        for (const cat of cats) {
            const photos = data.fotosSenas[cat.key] || [];
            if (photos.length > 0) {
                markPhotosHTML += `<div class="ficha-mark-section">
                    <div class="ficha-mark-label">${cat.label}</div>
                    <div class="ficha-mark-grid">
                        ${photos.map(src => `<img src="${src}" alt="${cat.label}">`).join('')}
                    </div>
                </div>`;
            }
        }
    }

    // Body photo
    let bodyPhotoHTML = '';
    if (data.fotoCuerpo) {
        bodyPhotoHTML = `
            <div class="ficha-mark-label">FOTOGRAFÍA DE CUERPO COMPLETO</div>
            <img src="${data.fotoCuerpo}" alt="Cuerpo completo" class="ficha-body-img">
        `;
    }

    // Contact
    let ctaText = 'Si tienes información sobre esta persona, contáctanos';
    if (d.contactoTel) ctaText += ` al <strong>${d.contactoTel}</strong>`;
    ctaText += ' · <strong>SI DESAPAREZCO, USEN ESTA FOTO</strong>';

    let contactText = '';
    if (d.contactoNombre || d.contactoTel) {
        contactText = 'CONTACTO: ';
        if (d.contactoNombre) contactText += d.contactoNombre;
        if (d.contactoTel) contactText += ` — ${d.contactoTel}`;
        if (d.contactoRelacion) contactText += ` (${d.contactoRelacion})`;
    }

    const now = new Date();
    const ts = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;

    cardEl.innerHTML = `
        <div class="ficha-header">
            <div class="ficha-header-inner">
                <div class="ficha-logo">SI DESAPAREZCO</div>
                <div class="ficha-header-right">
                    REPOSITORIO PREVENTIVO DE IDENTIDAD<br>
                    FICHA DE BÚSQUEDA
                </div>
            </div>
            <div class="ficha-header-line"></div>
        </div>
        <div class="ficha-alert-bar">PERSONA DESAPARECIDA &nbsp;·&nbsp; SE SOLICITA INFORMACIÓN</div>
        <div class="ficha-body">
            <div class="ficha-photo-container">${photoHTML}</div>
            <div class="ficha-data">
                <div class="ficha-name">${d.nombre || 'NOMBRE NO REGISTRADO'}</div>
                <div class="ficha-name-line"></div>
                <div class="ficha-grid">${mainFields}</div>
                <div class="ficha-section-divider"></div>
                <div class="ficha-section-title">RASGOS FÍSICOS</div>
                <div class="ficha-grid">${physicalFields}</div>
            </div>
        </div>
        <div class="ficha-section-divider-full"></div>
        <div class="ficha-marks-section">
            <div class="ficha-section-title">SEÑAS PARTICULARES</div>
            <div class="ficha-marks">${marksHTML}</div>
        </div>
        ${markPhotosHTML ? `<div class="ficha-marks-photos">${markPhotosHTML}</div>` : ''}
        ${bodyPhotoHTML ? `<div class="ficha-body-photo-section">${bodyPhotoHTML}</div>` : ''}
        <div class="ficha-section-divider-full"></div>
        <div class="ficha-registro-section">
            <div class="ficha-section-title">DATOS DE REGISTRO</div>
            <div class="ficha-registro-grid">
                ${data.timestamp ? `<span class="reg-label">CREADO</span><span class="reg-value">${new Date(data.timestamp).toLocaleDateString('es-MX')}</span>` : ''}
                <span class="reg-label">FUENTE</span><span class="reg-value">Archivo .SIDF / Si desaparezco, usen esta foto</span>
                <span class="reg-label">GENERADO</span><span class="reg-value">${ts}</span>
            </div>
        </div>
        <div class="ficha-cta-bar">${ctaText}</div>
        ${contactText ? `<div class="ficha-contact-line">${contactText}</div>` : ''}
        <div class="ficha-footer">
            <div class="ficha-footer-line"></div>
            <div class="ficha-generated">SI DESAPAREZCO, USEN ESTA FOTO &nbsp;·&nbsp; Repositorio Preventivo de Identidad &nbsp;·&nbsp; Generado ${ts}</div>
        </div>
    `;

    // Smooth scroll to ficha result
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}



// ── MARK CAMERA (for tattoos, scars, body photos) ────────────

const markCameraTitles = {
    tattoo: 'CAPTURAR FOTO DE TATUAJE',
    scar: 'CAPTURAR FOTO DE CICATRIZ',
    marks: 'CAPTURAR FOTO DE SEÑA PARTICULAR',
    body: 'CAPTURAR FOTO DE CUERPO COMPLETO'
};

async function openMarkCamera(category) {
    state.markCameraCategory = category;
    const modal = document.getElementById('mark-camera-modal');
    const video = document.getElementById('mark-camera-feed');
    const preview = document.getElementById('mark-camera-preview');
    const title = document.getElementById('mark-camera-title');
    const captureBtn = document.getElementById('btn-mark-capture');
    const retakeBtn = document.getElementById('btn-mark-retake');
    const saveBtn = document.getElementById('btn-mark-save');

    title.textContent = markCameraTitles[category] || 'CAPTURAR FOTO';
    
    // Reset UI
    video.style.display = 'block';
    preview.style.display = 'none';
    captureBtn.style.display = 'inline-flex';
    retakeBtn.style.display = 'none';
    saveBtn.style.display = 'none';

    modal.style.display = 'flex';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: category === 'body' ? 'environment' : 'user',
                width: { ideal: 1920 },
                height: { ideal: 1440 }
            }
        });
        state.markCameraStream = stream;
        video.srcObject = stream;
    } catch (err) {
        console.error('Mark camera error:', err);
        closeMarkCamera();
        // Fallback to file upload
        if (category === 'body') {
            document.getElementById('body-file').click();
        } else {
            document.getElementById(`${category}-files`).click();
        }
    }
}

function captureMarkPhoto() {
    const video = document.getElementById('mark-camera-feed');
    const canvas = document.getElementById('mark-camera-canvas');
    const preview = document.getElementById('mark-camera-preview');
    const captureBtn = document.getElementById('btn-mark-capture');
    const retakeBtn = document.getElementById('btn-mark-retake');
    const saveBtn = document.getElementById('btn-mark-save');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    preview.src = dataUrl;
    preview.style.display = 'block';
    video.style.display = 'none';

    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-flex';
    saveBtn.style.display = 'inline-flex';
}

function retakeMarkPhoto() {
    const video = document.getElementById('mark-camera-feed');
    const preview = document.getElementById('mark-camera-preview');
    const captureBtn = document.getElementById('btn-mark-capture');
    const retakeBtn = document.getElementById('btn-mark-retake');
    const saveBtn = document.getElementById('btn-mark-save');

    preview.style.display = 'none';
    video.style.display = 'block';
    captureBtn.style.display = 'inline-flex';
    retakeBtn.style.display = 'none';
    saveBtn.style.display = 'none';
}

function saveMarkPhoto() {
    const preview = document.getElementById('mark-camera-preview');
    const dataUrl = preview.src;
    const category = state.markCameraCategory;

    if (category === 'body') {
        state.bodyPhoto = dataUrl;
        renderBodyPreview();
    } else {
        state.markPhotos[category].push(dataUrl);
        renderMarkPreviews(category);
    }

    closeMarkCamera();
}

function closeMarkCamera() {
    if (state.markCameraStream) {
        state.markCameraStream.getTracks().forEach(track => track.stop());
        state.markCameraStream = null;
    }
    document.getElementById('mark-camera-modal').style.display = 'none';
}

// ── BODY PHOTO ────────────────────────────────────────────

function handleBodyPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        state.bodyPhoto = e.target.result;
        renderBodyPreview();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function renderBodyPreview() {
    const container = document.getElementById('body-preview');
    if (!container) return;

    container.innerHTML = '';
    if (state.bodyPhoto) {
        const thumb = document.createElement('div');
        thumb.className = 'body-thumb';
        thumb.innerHTML = `
            <img src="${state.bodyPhoto}" alt="Cuerpo completo">
            <button class="mark-photo-remove" onclick="removeBodyPhoto()" title="Eliminar">×</button>
        `;
        container.appendChild(thumb);
    }
}

function removeBodyPhoto() {
    state.bodyPhoto = null;
    renderBodyPreview();
}

// ── FORM DATA ──────────────────────────────────────────────────

/**
 * Collect all form data into a structured object
 */
function collectFormData() {
    return {
        nombre: document.getElementById('nombre')?.value || '',
        edad: document.getElementById('edad')?.value || '',
        fechaNacimiento: document.getElementById('fecha-nacimiento')?.value || '',
        estatura: document.getElementById('estatura')?.value || '',
        peso: document.getElementById('peso')?.value || '',
        complexion: document.getElementById('complexion')?.value || '',
        tez: document.getElementById('tez')?.value || '',
        cabello: document.getElementById('cabello')?.value || '',
        ojos: document.getElementById('ojos')?.value || '',
        tatuajes: document.getElementById('tatuajes')?.value || '',
        cicatrices: document.getElementById('cicatrices')?.value || '',
        otrasSenas: document.getElementById('otras-senas')?.value || '',
        contactoNombre: document.getElementById('contacto-nombre')?.value || '',
        contactoTel: document.getElementById('contacto-tel')?.value || '',
        contactoRelacion: document.getElementById('contacto-relacion')?.value || '',
        ubicacion: document.getElementById('ubicacion')?.value || '',
        notas: document.getElementById('notas')?.value || '',
    };
}

// ── PASSWORD VALIDATION ────────────────────────────────────────

function validatePassword() {
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('password-confirm').value;
    const feedback = document.getElementById('password-feedback');
    const strengthFill = document.getElementById('strength-fill');
    const strengthLabel = document.getElementById('strength-label');
    const encryptBtn = document.getElementById('btn-encrypt');

    // Evaluate strength
    const strength = CryptoModule.evaluatePassword(password);
    strengthFill.style.width = `${(strength.score / 4) * 100}%`;
    strengthFill.style.backgroundColor = strength.color;
    strengthLabel.textContent = strength.label;
    strengthLabel.style.color = strength.color;

    // Check match
    if (confirm && password !== confirm) {
        feedback.textContent = 'Las contraseñas no coinciden';
        encryptBtn.disabled = true;
        return false;
    }

    // Check length
    if (password.length > 0 && password.length < 8) {
        feedback.textContent = 'Mínimo 8 caracteres';
        encryptBtn.disabled = true;
        return false;
    }

    feedback.textContent = '';

    // Enable encrypt button only if valid
    const valid = password.length >= 8 && password === confirm;
    encryptBtn.disabled = !valid;
    return valid;
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ── ENCRYPTION FLOW ────────────────────────────────────────────

/**
 * Encrypt all data and generate the .sidf file
 */
async function encryptAndExport() {
    const password = document.getElementById('password').value;
    if (!validatePassword()) return;

    const overlay = document.getElementById('processing-overlay');
    const progressText = document.getElementById('processing-text');
    const progressFill = document.getElementById('processing-fill');

    overlay.style.display = 'flex';

    try {
        // Collect data
        progressText.textContent = 'RECOPILANDO DATOS...';
        progressFill.style.width = '10%';

        const formData = collectFormData();
        const payload = {
            version: 1,
            timestamp: new Date().toISOString(),
            foto: state.capturedImage,
            fotoCuerpo: state.bodyPhoto,
            datos: formData,
            fotosSenas: state.markPhotos
        };

        // Encrypt
        progressText.textContent = 'DERIVANDO CLAVE CRIPTOGRÁFICA...';

        const encryptedBytes = await CryptoModule.encrypt(
            payload,
            password,
            (progress) => {
                const mappedProgress = 20 + (progress * 0.7);
                progressFill.style.width = `${mappedProgress}%`;
                
                if (progress < 30) {
                    progressText.textContent = 'DERIVANDO CLAVE CRIPTOGRÁFICA...';
                } else if (progress < 60) {
                    progressText.textContent = 'CIFRANDO DATOS CON AES-256-GCM...';
                } else {
                    progressText.textContent = 'GENERANDO ARCHIVO PROTEGIDO...';
                }
            }
        );

        progressFill.style.width = '95%';
        progressText.textContent = 'FINALIZANDO...';

        // Create blob
        const blob = new Blob([encryptedBytes], { type: 'application/octet-stream' });
        const nombre = formData.nombre || 'ficha';
        const safeName = nombre.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').trim().replace(/\s+/g, '_');
        const fileName = `${safeName}_${Date.now()}.sidf`;

        state.encryptedBlob = blob;
        state.encryptedFileName = fileName;

        // Update UI
        document.getElementById('file-name').textContent = fileName;
        document.getElementById('file-size').textContent = formatBytes(blob.size);

        progressFill.style.width = '100%';

        // Small delay for visual feedback
        await delay(500);

        overlay.style.display = 'none';
        progressFill.style.width = '0%';

        // Navigate to completion
        navigateTo('screen-complete');

    } catch (error) {
        console.error('Encryption error:', error);
        overlay.style.display = 'none';
        progressFill.style.width = '0%';
        alert('Error durante el cifrado. Intenta de nuevo.');
    }
}

/**
 * Download the encrypted .sidf file
 */
function downloadFile() {
    if (!state.encryptedBlob) return;

    const url = URL.createObjectURL(state.encryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.encryptedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── DECRYPTION FLOW ────────────────────────────────────────────

let decryptFileBuffer = null;

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#52525b';
    event.currentTarget.style.background = '#f5f6f8';
}

function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '';
    event.currentTarget.style.background = '';

    const file = event.dataTransfer.files[0];
    if (file) loadDecryptFile(file);
}

function handleDecryptFile(event) {
    const file = event.target.files[0];
    if (file) loadDecryptFile(file);
}

function loadDecryptFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        decryptFileBuffer = e.target.result;
        
        document.getElementById('decrypt-upload-zone').style.display = 'none';
        document.getElementById('decrypt-file-loaded').style.display = 'flex';
        document.getElementById('decrypt-file-name').textContent = file.name;
        
        updateDecryptButton();
    };
    reader.readAsArrayBuffer(file);
}

function updateDecryptButton() {
    const hasFile = decryptFileBuffer !== null;
    const hasPassword = document.getElementById('decrypt-password').value.length > 0;
    document.getElementById('btn-decrypt').disabled = !(hasFile && hasPassword);
}

// Listen for password input on decrypt screen
document.addEventListener('DOMContentLoaded', () => {
    const decryptPwd = document.getElementById('decrypt-password');
    if (decryptPwd) {
        decryptPwd.addEventListener('input', updateDecryptButton);
    }
});

/**
 * Decrypt a loaded .sidf file
 */
async function decryptFile() {
    if (!decryptFileBuffer) return;

    const password = document.getElementById('decrypt-password').value;
    const errorEl = document.getElementById('decrypt-error');
    const overlay = document.getElementById('processing-overlay');
    const progressText = document.getElementById('processing-text');
    const progressFill = document.getElementById('processing-fill');

    errorEl.style.display = 'none';
    overlay.style.display = 'flex';

    try {
        progressText.textContent = 'VERIFICANDO ARCHIVO...';

        const data = await CryptoModule.decrypt(
            decryptFileBuffer,
            password,
            (progress) => {
                progressFill.style.width = `${progress}%`;
                
                if (progress < 20) {
                    progressText.textContent = 'VERIFICANDO ARCHIVO...';
                } else if (progress < 50) {
                    progressText.textContent = 'DERIVANDO CLAVE CRIPTOGRÁFICA...';
                } else if (progress < 80) {
                    progressText.textContent = 'DESCIFRANDO DATOS...';
                } else {
                    progressText.textContent = 'GENERANDO FICHA DE BÚSQUEDA...';
                }
            }
        );

        await delay(500);
        overlay.style.display = 'none';
        progressFill.style.width = '0%';

        // Store decrypted data
        state.decryptedData = data;

        // Generate the ficha
        generateFicha(data);

        // Navigate to ficha screen
        navigateTo('screen-ficha');

    } catch (error) {
        overlay.style.display = 'none';
        progressFill.style.width = '0%';

        errorEl.style.display = 'block';
        if (error.message === 'ARCHIVO_INVALIDO') {
            errorEl.textContent = 'Este archivo no es un archivo .sidf válido.';
        } else if (error.message === 'CONTRASEÑA_INCORRECTA') {
            errorEl.textContent = 'Contraseña incorrecta. No se puede descifrar el archivo.';
        } else {
            errorEl.textContent = 'Error al procesar el archivo. Intenta de nuevo.';
        }
    }
}

/**
 * Generate the search bulletin from decrypted data
 * Design: Mil Ojos — IBM Plex Mono/Sans, red #FF2D2D accent, green #00AA55 CTA
 */
function generateFicha(data) {
    const photoEl = document.getElementById('ficha-photo');
    const placeholderEl = document.getElementById('ficha-photo-placeholder');
    const nameEl = document.getElementById('ficha-name');
    const gridMain = document.getElementById('ficha-grid-main');
    const gridPhysical = document.getElementById('ficha-grid-physical');
    const marksEl = document.getElementById('ficha-marks');
    const marksPhotosEl = document.getElementById('ficha-marks-photos');
    const bodyPhotoEl = document.getElementById('ficha-body-photo');
    const registroEl = document.getElementById('ficha-registro');
    const ctaEl = document.getElementById('ficha-cta');
    const contactEl = document.getElementById('ficha-contact');
    const generatedEl = document.getElementById('ficha-generated');
    const d = data.datos;

    // ── Photo ────────────────────────────────────────────────
    if (data.foto) {
        photoEl.src = data.foto;
        photoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
    } else {
        photoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
    }

    // ── Name ─────────────────────────────────────────────────
    nameEl.textContent = d.nombre || 'NOMBRE NO REGISTRADO';

    // ── Helper: create a field cell ──────────────────────────
    function createField(label, value) {
        const field = document.createElement('div');
        field.className = 'ficha-field';

        const labelEl = document.createElement('div');
        labelEl.className = 'ficha-field-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('div');
        valueEl.className = 'ficha-field-value';
        valueEl.textContent = value || '—';

        field.appendChild(labelEl);
        field.appendChild(valueEl);
        return field;
    }

    // ── Main data grid ──────────────────────────────────────
    gridMain.innerHTML = '';
    const mainFields = [
        ['EDAD', d.edad ? `${d.edad} años` : null],
        ['F. NACIMIENTO', d.fechaNacimiento || null],
        ['UBICACIÓN', d.ubicacion || null],
        ['NOTAS', d.notas || null],
    ];
    for (const [label, value] of mainFields) {
        if (value) {
            gridMain.appendChild(createField(label, value));
        }
    }

    // ── Physical traits grid ────────────────────────────────
    gridPhysical.innerHTML = '';
    const physicalFields = [
        ['ESTATURA', d.estatura ? `${d.estatura} cm` : null],
        ['PESO', d.peso ? `${d.peso} kg` : null],
        ['COMPLEXIÓN', d.complexion || null],
        ['TEZ', d.tez || null],
        ['CABELLO', d.cabello || null],
        ['OJOS', d.ojos || null],
    ];
    for (const [label, value] of physicalFields) {
        if (value) {
            gridPhysical.appendChild(createField(label, value));
        }
    }

    // ── Señas Particulares ───────────────────────────────────
    marksEl.innerHTML = '';
    const markItems = [
        { label: 'TATUAJES', value: d.tatuajes },
        { label: 'CICATRICES', value: d.cicatrices },
        { label: 'OTRAS SEÑAS', value: d.otrasSenas },
    ];

    let hasMarks = false;
    for (const item of markItems) {
        if (item.value) {
            hasMarks = true;
            const h4 = document.createElement('h4');
            h4.textContent = item.label;
            marksEl.appendChild(h4);

            const p = document.createElement('p');
            p.textContent = item.value;
            marksEl.appendChild(p);
        }
    }

    if (!hasMarks) {
        const p = document.createElement('p');
        p.className = 'marks-empty';
        p.textContent = 'Sin señas particulares registradas';
        marksEl.appendChild(p);
    }

    // ── Mark photos (tattoo/scar/marks) ─────────────────────
    marksPhotosEl.innerHTML = '';
    if (data.fotosSenas) {
        const categories = [
            { key: 'tattoo', label: 'TATUAJES' },
            { key: 'scar', label: 'CICATRICES' },
            { key: 'marks', label: 'SEÑAS PARTICULARES' }
        ];

        for (const cat of categories) {
            const photos = data.fotosSenas[cat.key] || [];
            if (photos.length > 0) {
                const section = document.createElement('div');
                section.className = 'ficha-mark-section';

                const label = document.createElement('div');
                label.className = 'ficha-mark-label';
                label.textContent = cat.label;
                section.appendChild(label);

                const grid = document.createElement('div');
                grid.className = 'ficha-mark-grid';

                for (const photoSrc of photos) {
                    const img = document.createElement('img');
                    img.src = photoSrc;
                    img.alt = cat.label;
                    grid.appendChild(img);
                }

                section.appendChild(grid);
                marksPhotosEl.appendChild(section);
            }
        }
    }

    // ── Body photo ──────────────────────────────────────────
    bodyPhotoEl.innerHTML = '';
    if (data.fotoCuerpo) {
        const label = document.createElement('div');
        label.className = 'ficha-mark-label';
        label.textContent = 'FOTOGRAFÍA DE CUERPO COMPLETO';
        bodyPhotoEl.appendChild(label);

        const img = document.createElement('img');
        img.src = data.fotoCuerpo;
        img.alt = 'Cuerpo completo';
        img.className = 'ficha-body-img';
        bodyPhotoEl.appendChild(img);
    }

    // ── Datos de Registro ───────────────────────────────────
    const now = new Date();
    const ts = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}  ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

    registroEl.innerHTML = '';
    const regRows = [
        ['FUENTE', 'Archivo .SIDF / Si desaparezco, usen esta foto'],
        ['GENERADO', ts],
    ];

    if (data.timestamp) {
        regRows.unshift(['CREADO', new Date(data.timestamp).toLocaleDateString('es-MX')]);
    }

    for (const [label, value] of regRows) {
        const lbl = document.createElement('span');
        lbl.className = 'reg-label';
        lbl.textContent = label;
        registroEl.appendChild(lbl);

        const val = document.createElement('span');
        val.className = 'reg-value';
        val.textContent = value;
        registroEl.appendChild(val);
    }

    // ── CTA bar ─────────────────────────────────────────────
    if (d.contactoNombre || d.contactoTel) {
        let ctaText = 'Si tienes información sobre esta persona, contáctanos';
        if (d.contactoTel) ctaText += ` al <strong>${d.contactoTel}</strong>`;
        ctaText += ' · <strong>SI DESAPAREZCO, USEN ESTA FOTO</strong>';
        ctaEl.innerHTML = ctaText;
    }

    // ── Contact line ────────────────────────────────────────
    if (d.contactoNombre || d.contactoTel) {
        let contactText = 'CONTACTO: ';
        if (d.contactoNombre) contactText += d.contactoNombre;
        if (d.contactoTel) contactText += ` — ${d.contactoTel}`;
        if (d.contactoRelacion) contactText += ` (${d.contactoRelacion})`;
        contactEl.textContent = contactText;
    } else {
        contactEl.textContent = '';
    }

    // ── Footer timestamp ────────────────────────────────────
    generatedEl.textContent = `SI DESAPAREZCO, USEN ESTA FOTO  ·  Repositorio Preventivo de Identidad  ·  Generado ${ts}`;
}

/**
 * Download the ficha as a printable PNG image using html2canvas.
 * Temporarily forces inline styles on every internal element to
 * guarantee the desktop layout (720 × auto) regardless of viewport.
 */
async function downloadFicha() {
    const fichaCard   = document.getElementById('ficha-card');
    const fichaOutput = document.getElementById('ficha-output');

    // ── Collect elements whose styles we will override ─────────
    const saved = new Map();               // el → original cssText

    function pin(el, css) {
        if (!el) return;
        saved.set(el, el.style.cssText);   // save original
        Object.keys(css).forEach(k => { el.style[k] = css[k]; });
    }

    // Card wrapper — force 720px block so html2canvas reads this width
    pin(fichaOutput, {
        width:    '720px',
        maxWidth: '720px',
        overflow: 'visible',
        display:  'block',
    });

    // Card itself
    pin(fichaCard, {
        width:     '720px',
        maxWidth:  '720px',
        minWidth:  '720px',
        boxShadow: 'none',
    });

    // Photo + Data grid — force desktop side-by-side columns
    const fichaBody = fichaCard.querySelector('.ficha-body');
    pin(fichaBody, {
        display:             'grid',
        gridTemplateColumns: '220px 1fr',
        gap:                 '0px',
    });

    // Photo container — force desktop layout, NO maxHeight so it
    // stretches to match the data panel height via grid row stretch
    const photoContainer = fichaCard.querySelector('.ficha-photo-container');
    pin(photoContainer, {
        width:        '220px',
        minWidth:     '220px',
        height:       'auto',
        minHeight:    '280px',
        maxHeight:    'none',
        aspectRatio:  'unset',
        background:   '#F5F5F5',
        borderRight:  '1px solid #E0E0E0',
        borderBottom: 'none',
        position:     'relative',
        overflow:     'hidden',
    });

    // Photo <img> — fill 100% of its container (which stretches with
    // the grid), use object-fit cover to keep correct proportions
    const photo = fichaCard.querySelector('.ficha-photo');
    if (photo && photo.style.display !== 'none') {
        pin(photo, {
            width:     '100%',
            minWidth:  '220px',
            height:    '100%',
            minHeight: '280px',
            maxHeight: 'none',
            objectFit: 'cover',
            display:   'block',
        });
    }

    // Registro grid — force desktop 4-column layout
    const registroGrid = fichaCard.querySelector('.ficha-registro-grid');
    pin(registroGrid, { gridTemplateColumns: 'auto 1fr auto 1fr' });

    // Force reflow so html2canvas picks up final layout
    const renderedWidth = fichaCard.offsetWidth;
    const EXPORT_WIDTH  = 2800;
    const exportScale   = EXPORT_WIDTH / renderedWidth;

    try {
        const canvas = await html2canvas(fichaCard, {
            scale:           exportScale,
            useCORS:         true,
            allowTaint:      true,
            backgroundColor: '#ffffff',
            logging:         false,
            windowWidth:     EXPORT_WIDTH,
        });

        const dataUrl = canvas.toDataURL('image/png');

        const a = document.createElement('a');
        a.href     = dataUrl;
        a.download = `ficha_busqueda_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error('html2canvas error:', e);
        printFicha();
    }

    // ── Restore every element's original inline styles ──────
    for (const [el, css] of saved) {
        el.style.cssText = css;
    }
}

/**
 * Print the ficha
 */
function printFicha() {
    window.print();
}

// ── UTILITIES ──────────────────────────────────────────────────

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reset all state and go back to landing
 */
function resetAll() {
    stopCamera();
    
    state = {
        currentScreen: 'screen-landing',
        capturedImage: null,
        capturedImageBlob: null,
        formData: null,
        encryptedBlob: null,
        encryptedFileName: null,
        decryptedData: null,
        cameraStream: null,
        markPhotos: { tattoo: [], scar: [], marks: [] },
        bodyPhoto: null,
        markCameraStream: null,
        markCameraCategory: null
    };

    // Clear mark photo previews
    ['tattoo', 'scar', 'marks'].forEach(cat => {
        const el = document.getElementById(`${cat}-previews`);
        if (el) el.innerHTML = '';
    });

    // Clear body preview
    const bodyPreview = document.getElementById('body-preview');
    if (bodyPreview) bodyPreview.innerHTML = '';

    // Reset terms checkbox
    const termsBox = document.getElementById('accept-terms');
    if (termsBox) termsBox.checked = false;
    toggleBeginButton();

    decryptFileBuffer = null;

    // Reset form
    const form = document.getElementById('identity-form');
    if (form) form.reset();

    // Reset password fields
    const pwd = document.getElementById('password');
    const pwdConfirm = document.getElementById('password-confirm');
    if (pwd) pwd.value = '';
    if (pwdConfirm) pwdConfirm.value = '';

    // Reset capture UI
    const preview = document.getElementById('captured-preview');
    if (preview) preview.style.display = 'none';

    const retakeBtn = document.getElementById('btn-retake');
    if (retakeBtn) retakeBtn.style.display = 'none';

    const captureBtn = document.getElementById('btn-capture');
    if (captureBtn) {
        captureBtn.style.display = 'flex';
        captureBtn.disabled = true;
    }

    const continueBtn = document.getElementById('btn-to-data');
    if (continueBtn) continueBtn.disabled = true;

    // Reset decrypt
    const uploadZone = document.getElementById('decrypt-upload-zone');
    if (uploadZone) uploadZone.style.display = '';
    
    const fileLoaded = document.getElementById('decrypt-file-loaded');
    if (fileLoaded) fileLoaded.style.display = 'none';

    const decryptError = document.getElementById('decrypt-error');
    if (decryptError) decryptError.style.display = 'none';

    navigateTo('screen-landing');
}

// ── INITIALIZATION ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Ensure landing is shown
    const landing = document.getElementById('screen-landing');
    if (landing) {
        landing.style.display = 'block';
        landing.style.opacity = '1';
        landing.style.transform = 'translateY(0)';
    }

    // Pre-fetch artist ficha file
    prefetchArtistFile();

    // Check for Web Crypto API support
    if (!window.crypto || !window.crypto.subtle) {
        alert('Tu navegador no soporta Web Crypto API. ' +
              'Por favor usa un navegador moderno (Chrome, Firefox, Safari, Edge).');
    }

    console.log(
        '%c SI DESAPAREZCO, USEN ESTA FOTO ',
        'background: #1a1a1e; color: #fff; padding: 8px 16px; font-family: monospace; font-size: 14px;'
    );
    console.log(
        '%c Zero-Knowledge • AES-256-GCM • Sin servidores ',
        'color: #71717a; font-family: monospace; font-size: 11px;'
    );
});
