// src/app/components/product-form/product-form.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, Product } from '../../services/products.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent implements OnInit {
  productForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  productId: string | null = null;
  selectedImages: File[] = [];
  imagePreviews: string[] = [];

  // ✅ تأكد أن الـ categories متطابقة مع Backend Model enum
  categories = [
    { en: 'Medications', ar: 'أدوية' },
    { en: 'Vitamins and Supplements', ar: 'فيتامينات ومكملات' }, // ✅ بدون &
    { en: 'Personal Care', ar: 'العناية الشخصية' },
    { en: 'Medical Equipment', ar: 'معدات طبية' },
    { en: 'Baby and Mother Care', ar: 'رعاية الطفل والأم' }, // ✅ بدون &
    { en: 'Skin Care', ar: 'العناية بالبشرة' },
    { en: 'Herbal and Natural', ar: 'أعشاب وطبيعي' } // ✅ بدون &
  ];

  dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Spray'];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.productId = id;
        this.isEditMode = true;
        this.loadProduct(id);
      }
    });
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      nameArabic: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      scientificName: [''],
      category: ['', Validators.required],
      categoryArabic: [''],
      subCategory: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      discountPrice: [0, Validators.min(0)],
      stock: [0, [Validators.required, Validators.min(0)]],
      manufacturer: [''],
      requiresPrescription: [false],
      dosageForm: [''],
      strength: [''],
      packSize: [''],
      activeIngredients: [''],
      usageInstructions: [''],
      sideEffects: [''],
      contraindications: [''],
      warnings: [''],
      storageConditions: [''],
      expiryDate: [''],
      barcode: [''],
      sku: ['', Validators.required],
      tags: [''],
      isActive: [true],
      isFeatured: [false]
    });

    if (!this.isEditMode) {
      this.generateSKU();
    }
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getProductById(id).subscribe({
      next: (response) => {
        if (response.data.product) {
          const product = response.data.product;

          this.productForm.patchValue({
            name: product.name,
            nameArabic: product.nameArabic,
            description: product.description,
            scientificName: product.scientificName,
            category: product.category,
            categoryArabic: product.categoryArabic,
            subCategory: product.subCategory,
            price: product.price,
            discountPrice: product.discountPrice,
            stock: product.stock,
            manufacturer: product.manufacturer,
            requiresPrescription: product.requiresPrescription,
            dosageForm: product.dosageForm,
            strength: product.strength,
            packSize: product.packSize,
            activeIngredients: product.activeIngredients?.join(', '),
            usageInstructions: product.usageInstructions,
            sideEffects: product.sideEffects?.join(', '),
            contraindications: product.contraindications?.join(', '),
            warnings: product.warnings?.join(', '),
            storageConditions: product.storageConditions,
            expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
            barcode: product.barcode,
            sku: product.sku,
            tags: product.tags?.join(', '),
            isActive: product.isActive,
            isFeatured: product.isFeatured
          });

          if (product.images && product.images.length > 0) {
            this.imagePreviews = product.images.map(img => img.url);
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        alert('فشل تحميل بيانات المنتج');
        this.isLoading = false;
      }
    });
  }

  generateSKU(): void {
    const sku = 'PRD-' + Date.now().toString().slice(-8);
    this.productForm.patchValue({ sku });
  }

  onCategoryChange(): void {
    const category = this.productForm.get('category')?.value;
    const categoryObj = this.categories.find(c => c.en === category);
    if (categoryObj) {
      this.productForm.patchValue({ categoryArabic: categoryObj.ar });
    }
  }

  onImageSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];

    if (files.length + this.selectedImages.length > 5) {
      alert('يمكنك رفع 5 صور كحد أقصى');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('الرجاء اختيار صور فقط');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      this.selectedImages.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  onSubmit(): void {
    console.log('=== Form Submission ===');
    console.log('Form Valid:', this.productForm.valid);
    console.log('Form Value:', this.productForm.value);
    console.log('Form Errors:', this.getFormValidationErrors());

    if (this.productForm.invalid) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      this.markFormGroupTouched(this.productForm);
      return;
    }

    if (!this.isEditMode && this.selectedImages.length === 0) {
      alert('الرجاء اختيار صورة واحدة على الأقل');
      return;
    }

    this.isLoading = true;
    const formData = this.prepareFormData();

    if (this.isEditMode && this.productId) {
      this.updateProduct(formData);
    } else {
      this.createProduct(formData);
    }
  }

  prepareFormData(): FormData {
    const formData = new FormData();
    const formValue = this.productForm.value;

    console.log('=== Preparing FormData ===');
    console.log('Raw Form Value:', formValue);

    // Array fields that need special handling
    const arrayFields = ['activeIngredients', 'sideEffects', 'contraindications', 'warnings', 'tags'];

    Object.keys(formValue).forEach(key => {
      const value = formValue[key];

      // Skip null, undefined, or empty string values (except for numbers and booleans)
      if (value === null || value === undefined) {
        return;
      }

      // Skip empty strings for non-required fields
      if (value === '' && !['name', 'nameArabic', 'category', 'sku'].includes(key)) {
        return;
      }

      // Handle array fields - send as fieldName[]
      if (arrayFields.includes(key)) {
        if (typeof value === 'string' && value.trim()) {
          const arrayValue = value
            .split(',')
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);

          arrayValue.forEach(item => {
            formData.append(`${key}[]`, item);
          });
        }
      }
      // Handle boolean fields
      else if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      }
      // Handle number fields (including 0)
      else if (typeof value === 'number') {
        formData.append(key, value.toString());
      }
      // Handle string fields
      else if (value !== '') {
        formData.append(key, value.toString());
      }
    });

    // Append images
    this.selectedImages.forEach((image) => {
      formData.append('images', image, image.name);
    });

    // Debug: Log FormData contents
    console.log('=== FormData Contents ===');
    const formDataObj: any = {};
    formData.forEach((value, key) => {
      if (formDataObj[key]) {
        if (Array.isArray(formDataObj[key])) {
          formDataObj[key].push(value);
        } else {
          formDataObj[key] = [formDataObj[key], value];
        }
      } else {
        formDataObj[key] = value;
      }
      console.log(`${key}:`, value);
    });
    console.log('FormData Object:', formDataObj);

    return formData;
  }

  createProduct(formData: FormData): void {
    console.log('🚀 Sending create request...');

    this.productService.createProduct(formData).subscribe({
      next: (response) => {
        console.log('✅ Product created successfully:', response);
        alert('تم إضافة المنتج بنجاح');
        this.router.navigate(['/pharmacist-dashboard']);
      },
      error: (error) => {
        console.error('❌ Error creating product:', error);

        let errorMsg = 'فشل إضافة المنتج';

        // Handle different error formats
        if (error?.error?.errors && Array.isArray(error.error.errors)) {
          const errorDetails = error.error.errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join('\n');
          errorMsg += '\n\n' + errorDetails;
        } else if (error?.error?.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error?.message) {
          errorMsg += ': ' + error.message;
        }

        alert(errorMsg);
        this.isLoading = false;
      }
    });
  }

  updateProduct(formData: FormData): void {
    if (!this.productId) return;

    console.log('🔄 Sending update request...');

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: (response) => {
        console.log('✅ Product updated successfully:', response);
        alert('تم تحديث المنتج بنجاح');
        this.router.navigate(['/pharmacist-dashboard']);
      },
      error: (error) => {
        console.error('❌ Error updating product:', error);

        let errorMsg = 'فشل تحديث المنتج';

        if (error?.error?.errors && Array.isArray(error.error.errors)) {
          const errorDetails = error.error.errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join('\n');
          errorMsg += '\n\n' + errorDetails;
        } else if (error?.error?.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error?.message) {
          errorMsg += ': ' + error.message;
        }

        alert(errorMsg);
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    if (confirm('هل تريد إلغاء التغييرات؟')) {
      this.router.navigate(['/pharmacist-dashboard']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.productForm.controls).forEach(key => {
      const controlErrors = this.productForm.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }

  get f() {
    return this.productForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
