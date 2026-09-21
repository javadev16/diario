// Variables principales
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const fileInput = document.getElementById('fileInput');
const loadBtn = document.getElementById('loadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const placeholderMessage = document.getElementById('placeholderMessage');
const canvasWrapper = document.querySelector('.canvas-wrapper');

// Variables para la imagen
let originalImage = null;
let currentImage = null;
let imageData = null;
let isImageLoaded = false;
let history = [];

// Objetos de filtros
const filters = {
    brightness: 100,
    contrast: 100,
    exposure: 100,
    saturation: 100,
    hue: 0,
    temperature: 100,
    sharpness: 100,
    blur: 0
};

// Configurar canvas para 4K
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const maxWidth = window.innerWidth * 0.65;
    const maxHeight = window.innerHeight - 80;
    
    canvas.style.width = Math.min(originalImage.width, maxWidth) + 'px';
    canvas.style.height = Math.min(originalImage.height, maxHeight) + 'px';
    
    // Dibujar imagen con alta resolución
    canvas.width = originalImage.width * dpr;
    canvas.height = originalImage.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.drawImage(originalImage, 0, 0);
}

// Cargar imagen
loadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                currentImage = new Image();
                currentImage.src = img.src;
                
                setupCanvas();
                isImageLoaded = true;
                placeholderMessage.style.display = 'none';
                downloadBtn.disabled = false;
                resetBtn.disabled = false;
                
                // Actualizar información
                updateImageInfo(file);
                drawHistogram();
                applyFilters();
                
                // Limpiar historial
                history = [];
                
                // Drag and drop
                setupDragAndDrop();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Drag and Drop
function setupDragAndDrop() {
    canvasWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasWrapper.style.background = 'rgba(37, 99, 235, 0.1)';
    });
    
    canvasWrapper.addEventListener('dragleave', () => {
        canvasWrapper.style.background = 'radial-gradient(circle at center, var(--bg-tertiary) 0%, var(--bg-dark) 100%)';
    });
    
    canvasWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        canvasWrapper.style.background = 'radial-gradient(circle at center, var(--bg-tertiary) 0%, var(--bg-dark) 100%)';
        
        const files = e.dataTransfer.files;
        if (files[0]) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

// Actualizar valores de filtros
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', (e) => {
        const filterId = e.target.id;
        const value = e.target.value;
        
        filters[filterId] = value;
        
        // Actualizar texto del valor
        const valueDisplay = document.getElementById(filterId + 'Value');
        if (valueDisplay) {
            if (filterId === 'hue') {
                valueDisplay.textContent = value + '°';
            } else if (filterId === 'blur') {
                valueDisplay.textContent = value + 'px';
            } else if (filterId === 'temperature') {
                valueDisplay.textContent = value + '%';
            } else {
                valueDisplay.textContent = value + '%';
            }
        }
        
        if (isImageLoaded) {
            saveHistory();
            applyFilters();
            drawHistogram();
        }
    });
});

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remover activo de otros botones
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        applyPreset(e.target.dataset.preset);
    });
});

function applyPreset(preset) {
    saveHistory();
    
    // Restaurar valores por defecto
    Object.keys(filters).forEach(key => {
        filters[key] = key === 'hue' || key === 'blur' ? 0 : 100;
        const slider = document.getElementById(key);
        if (slider) slider.value = filters[key];
    });
    
    // Aplicar preset
    switch(preset) {
        case 'grayscale':
            filters.saturation = 0;
            document.getElementById('saturation').value = 0;
            break;
        case 'sepia':
            filters.hue = -30;
            filters.saturation = 60;
            filters.brightness = 110;
            document.getElementById('hue').value = -30;
            document.getElementById('saturation').value = 60;
            document.getElementById('brightness').value = 110;
            break;
        case 'vintage':
            filters.saturation = 70;
            filters.contrast = 85;
            filters.brightness = 110;
            filters.hue = 20;
            document.getElementById('saturation').value = 70;
            document.getElementById('contrast').value = 85;
            document.getElementById('brightness').value = 110;
            document.getElementById('hue').value = 20;
            break;
        case 'cool':
            filters.temperature = 60;
            filters.saturation = 120;
            document.getElementById('temperature').value = 60;
            document.getElementById('saturation').value = 120;
            break;
        case 'warm':
            filters.temperature = 140;
            filters.saturation = 120;
            document.getElementById('temperature').value = 140;
            document.getElementById('saturation').value = 120;
            break;
        case 'vivid':
            filters.saturation = 150;
            filters.contrast = 120;
            filters.brightness = 110;
            document.getElementById('saturation').value = 150;
            document.getElementById('contrast').value = 120;
            document.getElementById('brightness').value = 110;
            break;
    }
    
    updateFilterValues();
    applyFilters();
    drawHistogram();
}

function updateFilterValues() {
    Object.keys(filters).forEach(key => {
        const valueDisplay = document.getElementById(key + 'Value');
        if (valueDisplay) {
            const value = filters[key];
            if (key === 'hue') {
                valueDisplay.textContent = value + '°';
            } else if (key === 'blur') {
                valueDisplay.textContent = value + 'px';
            } else {
                valueDisplay.textContent = value + '%';
            }
        }
    });
}

// Aplicar filtros
function applyFilters() {
    if (!originalImage) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);
    
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Aplicar filtros en orden
    applyBrightnessContrast(data);
    applyExposure(data);
    applySaturationHue(data);
    applyTemperature(data);
    applySharpness();
    if (filters.blur > 0) {
        applyBlur();
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyBrightnessContrast(data) {
    const brightness = filters.brightness / 100;
    const contrast = filters.contrast / 100;
    
    for (let i = 0; i < data.length; i += 4) {
        // Brillo
        data[i] = data[i] * brightness;
        data[i + 1] = data[i + 1] * brightness;
        data[i + 2] = data[i + 2] * brightness;
        
        // Contraste
        data[i] = ((data[i] - 128) * contrast) + 128;
        data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
        data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;
        
        // Limitar valores
        data[i] = Math.max(0, Math.min(255, data[i]));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
}

function applyExposure(data) {
    const exposure = filters.exposure / 100;
    const factor = Math.exp((exposure - 1) * 2);
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * factor));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor));
    }
}

function applySaturationHue(data) {
    const saturation = filters.saturation / 100;
    const hue = filters.hue;
    
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // RGB a HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l;
        
        l = (max + min) / 2 / 255;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        // Aplicar ajustes
        h = (h + hue / 360) % 1;
        s *= saturation;
        s = Math.max(0, Math.min(1, s));
        
        // HSL a RGB
        let p, q;
        if (s === 0) {
            p = q = l;
        } else {
            q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            p = 2 * l - q;
        }
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        data[i] = Math.round(hue2rgb(p, q, h + 1/3) * 255);
        data[i + 1] = Math.round(hue2rgb(p, q, h) * 255);
        data[i + 2] = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    }
}

function applyTemperature(data) {
    const temp = filters.temperature / 100;
    const factor = (temp - 1) * 0.5;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * (1 + factor))); // Rojo
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * (1 - factor))); // Azul
    }
}

function applySharpness() {
    if (filters.sharpness === 100) return;
    
    const strength = (filters.sharpness - 100) / 100;
    const kernel = [
        0, -0.25 * strength, 0,
        -0.25 * strength, 1 + strength, -0.25 * strength,
        0, -0.25 * strength, 0
    ];
    
    convolve(kernel);
}

function applyBlur() {
    const radius = Math.round(filters.blur);
    if (radius === 0) return;
    
    const kernel = [];
    const size = radius * 2 + 1;
    const sum = size * size;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            kernel.push(1 / sum);
        }
    }
    
    convolve(kernel, radius);
}

function convolve(kernel, radius = 1) {
    const width = canvas.width;
    const height = canvas.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    const kernelSize = Math.sqrt(kernel.length);
    const offset = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx - offset));
                    const py = Math.min(height - 1, Math.max(0, y + ky - offset));
                    
                    const idx = (py * width + px) * 4;
                    const k = kernel[ky * kernelSize + kx];
                    
                    r += data[idx] * k;
                    g += data[idx + 1] * k;
                    b += data[idx + 2] * k;
                }
            }
            
            const idx = (y * width + x) * 4;
            newData[idx] = Math.round(r);
            newData[idx + 1] = Math.round(g);
            newData[idx + 2] = Math.round(b);
        }
    }
    
    for (let i = 0; i < data.length; i++) {
        data[i] = newData[i];
    }
}

// Histograma
function drawHistogram() {
    const histCanvas = document.getElementById('histogramCanvas');
    const histCtx = histCanvas.getContext('2d');
    
    if (!isImageLoaded || !imageData) {
        histCtx.fillStyle = '#1e293b';
        histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);
        return;
    }
    
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        histogram[Math.floor(gray)]++;
    }
    
    const max = Math.max(...histogram);
    const width = histCanvas.width;
    const height = histCanvas.height;
    
    histCtx.fillStyle = '#1e293b';
    histCtx.fillRect(0, 0, width, height);
    
    histCtx.fillStyle = '#06b6d4';
    const barWidth = width / 256;
    
    for (let i = 0; i < 256; i++) {
        const barHeight = (histogram[i] / max) * height;
        histCtx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
}

// Actualizar información de la imagen
function updateImageInfo(file) {
    document.getElementById('infoName').textContent = file.name;
    document.getElementById('infoDimensions').textContent = `${originalImage.width} × ${originalImage.height}`;
    document.getElementById('infoSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('infoType').textContent = file.type || 'desconocido';
}

// Guardar historial
function saveHistory() {
    history.push({
        brightness: filters.brightness,
        contrast: filters.contrast,
        exposure: filters.exposure,
        saturation: filters.saturation,
        hue: filters.hue,
        temperature: filters.temperature,
        sharpness: filters.sharpness,
        blur: filters.blur
    });
}

// Restaurar imagen original
resetBtn.addEventListener('click', () => {
    Object.assign(filters, {
        brightness: 100,
        contrast: 100,
        exposure: 100,
        saturation: 100,
        hue: 0,
        temperature: 100,
        sharpness: 100,
        blur: 0
    });
    
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const defaultValue = slider.id === 'hue' || slider.id === 'blur' ? 0 : 100;
        slider.value = defaultValue;
    });
    
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    
    updateFilterValues();
    applyFilters();
    drawHistogram();
    history = [];
});

// Descargar imagen
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `edited-photo-${new Date().getTime()}.png`;
    link.click();
});

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z' && history.length > 0) {
        const state = history.pop();
        Object.assign(filters, state);
        updateFilterValues();
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.value = filters[slider.id];
        });
        applyFilters();
        drawHistogram();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        downloadBtn.click();
    } else if (e.key === 'r' && isImageLoaded) {
        resetBtn.click();
    }
});

// Ajustar canvas cuando se redimensiona la ventana
window.addEventListener('resize', () => {
    if (isImageLoaded) {
        setupCanvas();
        applyFilters();
    }
});

// Inicializar
console.log('Editor de fotos cargado ✓');
console.log('Resolución máxima: 4K');
console.log('Usa Ctrl+Z para deshacer, Ctrl+S para descargar, R para restaurar');
