// Service for managing company assets and branding
import logoImage from '@/assets/logo.png';

export class AssetsService {
  static getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load logo image'));
      };
      
      img.src = logoImage;
    });
  }

  static getLogoUrl(): string {
    return logoImage;
  }

  static async getCompanyHeader(): Promise<string> {
    try {
      const logoBase64 = await this.getLogoBase64();
      return `
        <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
          <img src="${logoBase64}" alt="Manuara Eco Lodge" style="height: 60px; margin-right: 15px;" />
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">Manuara Eco Lodge</h1>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Isla de Pascua - Easter Island</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error getting company header:', error);
      // Fallback without logo
      return `
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">Manuara Eco Lodge</h1>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Isla de Pascua - Easter Island</p>
        </div>
      `;
    }
  }

  static getCompanyInfo(): string {
    return `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 5px 0;"><strong>Manuara Eco Lodge</strong></p>
        <p style="margin: 5px 0;">Isla de Pascua - Easter Island</p>
        <p style="margin: 5px 0;">Email: info@manuara.cl | Teléfono: +56 9 XXXX XXXX</p>
        <p style="margin: 5px 0;">www.manuara.cl</p>
      </div>
    `;
  }
}