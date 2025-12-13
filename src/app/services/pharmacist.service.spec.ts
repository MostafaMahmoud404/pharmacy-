// src/app/services/pharmacist.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PharmacistService } from './pharmacist.service';
import { environment } from '../../environments/environment';

describe('PharmacistService', () => {
  let service: PharmacistService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PharmacistService]
    });

    service = TestBed.inject(PharmacistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDashboard', () => {
    it('should fetch dashboard data', (done) => {
      const mockResponse = {
        success: true,
        message: 'Dashboard data retrieved',
        data: {
          stats: {
            orders: { new: 5, processing: 10, today: 20 },
            revenue: { today: 5000 },
            prescriptions: { new: 3 },
            inventory: { lowStock: 7, outOfStock: 2 },
            lowStockProducts: [],
            recentOrders: []
          }
        }
      };

      service.getDashboard().subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data.stats.orders.new).toBe(5);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/dashboard/pharmacist`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getOrders', () => {
    it('should fetch orders with default parameters', (done) => {
      const mockResponse = {
        success: true,
        data: {
          orders: [
            {
              _id: '1',
              orderNumber: 'ORD001',
              status: 'pending',
              pricing: { total: 100 }
            }
          ]
        }
      };

      service.getOrders().subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data.orders.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/api/orders`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should fetch orders with custom parameters', (done) => {
      const mockResponse = {
        success: true,
        data: { orders: [] }
      };

      service.getOrders(1, 10, 'pending').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes(`${apiUrl}/api/orders`) &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '10' &&
        r.params.get('status') === 'pending'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getOrderById', () => {
    it('should fetch single order by ID', (done) => {
      const orderId = '123';
      const mockResponse = {
        success: true,
        data: {
          order: {
            _id: orderId,
            orderNumber: 'ORD001',
            status: 'confirmed'
          }
        }
      };

      service.getOrderById(orderId).subscribe((response) => {
        expect(response.data.order._id).toBe(orderId);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/orders/${orderId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('confirmOrder', () => {
    it('should confirm order', (done) => {
      const orderId = '123';
      const mockResponse = {
        success: true,
        message: 'Order confirmed',
        data: { order: { status: 'confirmed' } }
      };

      service.confirmOrder(orderId).subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/orders/${orderId}/confirm`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', (done) => {
      const orderId = '123';
      const mockResponse = {
        success: true,
        data: { order: { status: 'preparing' } }
      };

      service.updateOrderStatus(orderId, 'preparing', 'Starting preparation').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/orders/${orderId}/status`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.status).toBe('preparing');
      expect(req.request.body.note).toBe('Starting preparation');
      req.flush(mockResponse);
    });
  });

  describe('getPrescriptions', () => {
    it('should fetch prescriptions', (done) => {
      const mockResponse = {
        success: true,
        data: { prescriptions: [] }
      };

      service.getPrescriptions().subscribe(() => {
        done();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes(`${apiUrl}/api/prescriptions`)
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getProducts', () => {
    it('should fetch products', (done) => {
      const mockResponse = {
        success: true,
        data: {
          products: [
            {
              _id: '1',
              name: 'Product 1',
              stock: 100
            }
          ]
        }
      };

      service.getProducts().subscribe(() => {
        done();
      });

      const req = httpMock.expectOne((r) =>
        r.url.includes(`${apiUrl}/api/products`)
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock', (done) => {
      const productId = '123';
      const mockResponse = {
        success: true,
        data: { product: { stock: 50 } }
      };

      service.updateProductStock(productId, 10, 'decrease').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/products/${productId}/stock`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.quantity).toBe(10);
      expect(req.request.body.operation).toBe('decrease');
      req.flush(mockResponse);
    });
  });
});
