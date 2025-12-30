import { useState } from 'react';
import { Settings, ExternalLink, Copy, Check, X } from 'lucide-react';

export default function EmailSetupGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
      >
        <Settings className="w-4 h-4" />
        Email Setup
      </button>

      {showGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">EmailJS Setup Guide</h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold mb-2">Enable Real Email Sending</h3>
                <p className="text-gray-300 text-sm">
                  Follow these steps to send actual emails instead of opening your email client.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-700 rounded-lg p-3">
                  <h4 className="text-white font-medium mb-2">Step 1: EmailJS Account</h4>
                  <p className="text-gray-300 text-sm">
                    Go to <a href="https://emailjs.com" target="_blank" className="text-blue-400 hover:underline">emailjs.com</a> and create a free account
                  </p>
                </div>

                <div className="border border-gray-700 rounded-lg p-3">
                  <h4 className="text-white font-medium mb-2">Step 2: Email Service</h4>
                  <p className="text-gray-300 text-sm">
                    Add your email service (Gmail, Outlook, etc.) and copy the Service ID
                  </p>
                </div>

                <div className="border border-gray-700 rounded-lg p-3">
                  <h4 className="text-white font-medium mb-2">Step 3: Email Template</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Create a template with these variables:
                  </p>
                  <div className="bg-gray-800 rounded p-2 text-xs text-gray-300 font-mono">
                    supplier_name, product_count, product_list, contact_person, company_name
                  </div>
                </div>

                <div className="border border-gray-700 rounded-lg p-3">
                  <h4 className="text-white font-medium mb-2">Step 4: Update Code</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    In supplierEmailService.ts, update:
                  </p>
                  <div className="bg-gray-800 rounded p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <code className="text-green-400 text-xs">serviceId = 'your_service_id'</code>
                      <button
                        onClick={() => copyToClipboard("serviceId = 'your_service_id'", 'service')}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {copied === 'service' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-green-400 text-xs">templateId = 'your_template_id'</code>
                      <button
                        onClick={() => copyToClipboard("templateId = 'your_template_id'", 'template')}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {copied === 'template' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-green-400 text-xs">publicKey = 'your_public_key'</code>
                      <button
                        onClick={() => copyToClipboard("publicKey = 'your_public_key'", 'public')}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {copied === 'public' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-3">
                  <h4 className="text-green-400 font-medium mb-1">Ready!</h4>
                  <p className="text-gray-300 text-sm">
                    Your system will now send real emails automatically with fallback to email client.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}