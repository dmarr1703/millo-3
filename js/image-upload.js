// Image Upload Manager for millo
// Handles image uploads, preview, storage, and management

class ImageUploadManager {
    constructor() {
        this.currentImage = null;
        this.images = this.loadImages();
        this.init();
    }

    init() {
        // Check authentication
        this.checkAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load and display gallery
        this.displayGallery();
    }

    checkAuth() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Only sellers and admins can access this page
        if (currentUser.role !== 'seller' && currentUser.role !== 'admin') {
            alert('Access denied. Only sellers and admins can upload images.');
            window.location.href = 'index.html';
            return;
        }
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Click to browse
        dropZone.addEventListener('click', (e) => {
            if (e.target.id !== 'fileInput' && !e.target.closest('label')) {
                fileInput.click();
            }
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        // Show progress
        this.showProgress();

        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showStatus('error', `${file.name} is not a valid image file.`);
                continue;
            }

            try {
                // Update progress
                const progress = ((i + 1) / files.length) * 100;
                this.updateProgress(progress, `Processing ${i + 1} of ${files.length}...`);

                // Read and process file
                await this.processImage(file);
                
            } catch (error) {
                console.error('Error processing image:', error);
                this.showStatus('error', `Error processing ${file.name}: ${error.message}`);
            }
        }

        // Hide progress
        setTimeout(() => {
            this.hideProgress();
            this.showStatus('success', `Successfully uploaded ${files.length} image(s)!`);
        }, 500);

        // Refresh gallery
        this.displayGallery();
        
        // Clear file input
        document.getElementById('fileInput').value = '';
    }

    processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // Create image object
                    const imageData = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        width: img.width,
                        height: img.height,
                        dataURL: e.target.result,
                        uploadDate: new Date().toISOString(),
                        userId: JSON.parse(localStorage.getItem('currentUser')).id
                    };

                    // Save image
                    this.saveImage(imageData);
                    
                    resolve(imageData);
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    saveImage(imageData) {
        this.images.push(imageData);
        localStorage.setItem('uploadedImages', JSON.stringify(this.images));
    }

    loadImages() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const allImages = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
        
        // Filter images by current user (or show all for admin)
        if (currentUser && currentUser.role === 'admin') {
            return allImages;
        } else if (currentUser) {
            return allImages.filter(img => img.userId === currentUser.id);
        }
        
        return [];
    }

    displayGallery() {
        const gallery = document.getElementById('imageGallery');
        const emptyGallery = document.getElementById('emptyGallery');

        if (this.images.length === 0) {
            gallery.classList.add('hidden');
            emptyGallery.classList.remove('hidden');
            return;
        }

        gallery.classList.remove('hidden');
        emptyGallery.classList.add('hidden');

        // Sort by upload date (newest first)
        const sortedImages = [...this.images].sort((a, b) => 
            new Date(b.uploadDate) - new Date(a.uploadDate)
        );

        gallery.innerHTML = sortedImages.map(img => `
            <div class="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                 onclick="imageManager.viewImage('${img.id}')">
                <img src="${img.dataURL}" alt="${img.name}" class="thumbnail w-full">
                <div class="p-2 bg-gray-50">
                    <p class="text-xs text-gray-600 truncate" title="${img.name}">${img.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(img.size)}</p>
                </div>
            </div>
        `).join('');
    }

    viewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        this.currentImage = image;

        // Show preview area
        document.getElementById('previewArea').classList.remove('hidden');

        // Display image
        document.getElementById('previewImg').src = image.dataURL;

        // Display image info
        document.getElementById('imageInfo').innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm font-semibold text-gray-700">File Name:</p>
                    <p class="text-sm text-gray-600">${image.name}</p>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">File Type:</p>
                    <p class="text-sm text-gray-600">${image.type}</p>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">File Size:</p>
                    <p class="text-sm text-gray-600">${this.formatFileSize(image.size)}</p>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Dimensions:</p>
                    <p class="text-sm text-gray-600">${image.width} × ${image.height} px</p>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Upload Date:</p>
                    <p class="text-sm text-gray-600">${new Date(image.uploadDate).toLocaleString()}</p>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-700">Image ID:</p>
                    <p class="text-sm text-gray-600 truncate">${image.id}</p>
                </div>
            </div>
        `;

        // Scroll to preview
        document.getElementById('previewArea').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showProgress() {
        document.getElementById('uploadProgress').classList.remove('hidden');
    }

    hideProgress() {
        document.getElementById('uploadProgress').classList.add('hidden');
        this.updateProgress(0, '');
    }

    updateProgress(percent, text) {
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = text;
    }

    showStatus(type, message) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
        
        if (type === 'success') {
            statusDiv.classList.add('bg-green-100', 'text-green-800');
            statusDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
        } else {
            statusDiv.classList.add('bg-red-100', 'text-red-800');
            statusDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    copyImageURL() {
        if (!this.currentImage) return;

        // Create a text area to copy from
        const textArea = document.createElement('textarea');
        textArea.value = this.currentImage.dataURL;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showStatus('success', 'Image URL copied to clipboard!');
        } catch (err) {
            this.showStatus('error', 'Failed to copy URL. Please try again.');
        }
        
        document.body.removeChild(textArea);
    }

    downloadImage() {
        if (!this.currentImage) return;

        const link = document.createElement('a');
        link.href = this.currentImage.dataURL;
        link.download = this.currentImage.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatus('success', 'Image downloaded successfully!');
    }

    deleteImage() {
        if (!this.currentImage) return;

        if (confirm('Are you sure you want to delete this image?')) {
            // Remove from array
            this.images = this.images.filter(img => img.id !== this.currentImage.id);
            
            // Save to localStorage
            localStorage.setItem('uploadedImages', JSON.stringify(this.images));
            
            // Hide preview
            document.getElementById('previewArea').classList.add('hidden');
            
            // Refresh gallery
            this.displayGallery();
            
            // Clear current image
            this.currentImage = null;
            
            this.showStatus('success', 'Image deleted successfully!');
        }
    }
}

// Initialize the image manager
let imageManager;

document.addEventListener('DOMContentLoaded', () => {
    imageManager = new ImageUploadManager();
});

// Global functions for button clicks
function copyImageURL() {
    imageManager.copyImageURL();
}

function downloadImage() {
    imageManager.downloadImage();
}

function deleteImage() {
    imageManager.deleteImage();
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
