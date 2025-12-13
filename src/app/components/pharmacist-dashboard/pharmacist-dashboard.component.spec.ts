import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PharmacistDashboardComponent } from './pharmacist-dashboard.component';

describe('PharmacistDashboardComponent', () => {
    let component: PharmacistDashboardComponent;
    let fixture: ComponentFixture<PharmacistDashboardComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [PharmacistDashboardComponent]
        });
        fixture = TestBed.createComponent(PharmacistDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
