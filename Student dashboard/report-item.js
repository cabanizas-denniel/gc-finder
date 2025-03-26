document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-bar .step');
    let currentStep = 0;

    // Initialize form navigation
    initFormNavigation();

    // Initialize dropzone
    initDropzone();

    // Handle form submission
    form.addEventListener('submit', handleSubmit);

    function initFormNavigation() {
        // Next buttons
        document.querySelectorAll('.next-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    goToStep(currentStep + 1);
                }
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(button => {
            button.addEventListener('click', () => {
                goToStep(currentStep - 1);
            });
        });

        // Make sidebar links work
        document.querySelectorAll('.sidebar li').forEach(item => {
            item.addEventListener('click', function() {
                const text = this.textContent.trim();
                if (text === 'Dashboard') {
                    window.location.href = 'dashboard.html';
                }
                // Add other navigation links as needed
            });
        });
    }

    function validateStep(step) {
        const currentStepElement = steps[step];
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                
                // Remove error class when user starts typing
                field.addEventListener('input', () => {
                    field.classList.remove('error');
                }, { once: true });
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields.');
        }

        return isValid;
    }

    function goToStep(step) {
        if (step >= 0 && step < steps.length) {
            steps[currentStep].classList.remove('active');
            progressSteps[currentStep].classList.remove('active');
            
            currentStep = step;
            
            steps[currentStep].classList.add('active');
            progressSteps[currentStep].classList.add('active');

            // If we're on the confirmation step, populate the summary
            if (currentStep === 3) {
                populateSummary();
            }
        }
    }

    function initDropzone() {
        const dropzone = document.getElementById('dropzone');
        const uploadBtn = dropzone.querySelector('.upload-btn');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';

        // Handle drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        // Handle button upload
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            handleFiles(fileInput.files);
        });
    }

    function handleFiles(files) {
        const uploadArea = document.querySelector('.upload-area');
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.createElement('div');
                    preview.className = 'image-preview';
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-btn"><i class="fas fa-times"></i></button>
                    `;
                    uploadArea.appendChild(preview);

                    // Handle remove button
                    preview.querySelector('.remove-btn').addEventListener('click', () => {
                        preview.remove();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function populateSummary() {
        const summaryDetails = document.getElementById('summaryDetails');
        const itemName = document.getElementById('itemName').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const dateFound = document.getElementById('dateFound').value;
        const category = document.getElementById('category').value;
        const exactLocation = document.getElementById('exactLocation').value;

        summaryDetails.innerHTML = `
            <div class="summary-item">
                <strong>Item Name:</strong> ${itemName}
            </div>
            <div class="summary-item">
                <strong>Description:</strong> ${description}
            </div>
            <div class="summary-item">
                <strong>Location:</strong> ${location}
            </div>
            <div class="summary-item">
                <strong>Date Found:</strong> ${dateFound}
            </div>
            <div class="summary-item">
                <strong>Category:</strong> ${category}
            </div>
            <div class="summary-item">
                <strong>Exact Location:</strong> ${exactLocation}
            </div>
        `;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateStep(currentStep)) {
            return;
        }

        // Collect form data
        const formData = new FormData(form);
        
        try {
            // Here you would typically send the data to your backend
            // For now, we'll just simulate a successful submission
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert('Report submitted successfully!');
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert('An error occurred while submitting the report. Please try again.');
        }
    }
}); 