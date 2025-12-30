import emailjs from '@emailjs/browser';

interface RestockEmailData {
  productName: string;
  currentStock: number;
  reorderQuantity: number;
  supplierName: string;
  supplierEmail: string;
}

interface BulkEmailData {
  supplierName: string;
  supplierEmail: string;
  products: Array<{
    name: string;
    sku: string;
    currentStock: number;
    reorderQuantity: number;
  }>;
}

class SupplierEmailService {
  // EmailJS Configuration - Replace with your actual values
  private serviceId = 'service_fvmra3o';     // e.g., 'service_abc123'
  private templateId = 'template_ndbc0xa';   // e.g., 'template_xyz789'
  private publicKey = '8EHJK2om7_MkMXnlm';     // e.g., 'user_def456'

  constructor() {
    // Initialize EmailJS
    emailjs.init(this.publicKey);
  }

  private companyInfo = {
    name: 'Smart Inventory Solutions',
    contactPerson: 'Inventory Manager',
    email: 'inventory@smartinventory.com',
    phone: '+63 917 123 4567'
  };

  async sendBulkRestockEmail(data: BulkEmailData): Promise<boolean> {
    try {
      // Using mailto as primary method - more reliable
      this.openEmailClient(data);
      return true;
    } catch (error) {
      console.error('Failed to open email client:', error);
      return false;
    }
  }

  openEmailClient(data: BulkEmailData): void {
    const productList = data.products.map(p => 
      `- ${p.name} (${p.sku}): Current Stock: ${p.currentStock} units, Reorder: ${p.reorderQuantity} units`
    ).join('%0D%0A');

    const emailContent = `Dear ${data.supplierName},%0D%0A%0D%0AOur inventory shows that the following ${data.products.length} item(s) are running low or out of stock:%0D%0A%0D%0A${productList}%0D%0A%0D%0APlease confirm availability and expected delivery date for all items at your earliest convenience.%0D%0AThank you for your continued support.%0D%0A%0D%0ABest regards,%0D%0A${this.companyInfo.contactPerson}%0D%0A${this.companyInfo.name}%0D%0A${this.companyInfo.email}%0D%0A${this.companyInfo.phone}`;

    const subject = `Bulk Restock Request - ${data.products.length} Items`;
    const mailtoLink = `mailto:${data.supplierEmail}?subject=${encodeURIComponent(subject)}&body=${emailContent}`;
    
    try {
      // Try to open email client
      window.location.href = mailtoLink;
      
      // Show success message
      setTimeout(() => {
        alert('Email client should have opened. If not, copy the email details from the preview above.');
      }, 1000);
    } catch (error) {
      alert('Could not open email client. Please copy the email details manually.');
    }
  }

  generateEmailPreview(data: BulkEmailData): string {
    const productList = data.products.map(p => 
      `- ${p.name} (${p.sku}): Current Stock: ${p.currentStock} units, Reorder: ${p.reorderQuantity} units`
    ).join('\n');

    return `Subject: Bulk Restock Request - ${data.products.length} Items

Dear ${data.supplierName},

Our inventory shows that the following ${data.products.length} item(s) are running low or out of stock:

${productList}

Please confirm availability and expected delivery date for all items at your earliest convenience.
Thank you for your continued support.

Best regards,
${this.companyInfo.contactPerson}
${this.companyInfo.name}
${this.companyInfo.email}
${this.companyInfo.phone}`;
  }
}

export const supplierEmailService = new SupplierEmailService();
export type { RestockEmailData, BulkEmailData };