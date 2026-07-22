import React, { useRef, useState } from 'react';
import { CloudUpload, FileUp, Zap, Image as ImageIcon, ZoomIn, ImagePlus, Camera } from 'lucide-react';
import { motion } from 'motion/react';

export default function UploadScreen({ onNext }) {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Aadhaar Card
        </h1>
        <p className="text-on-surface-variant font-medium">
          Upload Aadhaar card to auto-fill patient details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all hover:border-primary group bg-surface-container-low/30 cursor-pointer"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-headline mb-2">Drag and drop Aadhaar image</h3>
              <p className="text-sm text-on-surface-variant mb-8 max-w-xs">
                Supports high-resolution PNG, JPG, or PDF (Front & Back)
              </p>
              <div className="flex gap-4">
                <button className="primary-gradient text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-primary/30 active:scale-95 transition-all duration-150">
                  <FileUp className="w-5 h-5" />
                  Upload Image
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h4 className="font-bold text-lg font-headline">Ready for Processing?</h4>
                <p className="text-sm text-on-surface-variant">Extract names, DOB, and addresses instantly</p>
              </div>
            </div>
            <button
              onClick={() => preview && onNext(preview)}
              disabled={!preview}
              className={`px-10 py-4 rounded-xl font-extrabold text-lg flex items-center gap-3 shadow-xl transition-all duration-150 w-full md:w-auto justify-center ${preview
                ? 'primary-gradient text-white shadow-primary/40 hover:scale-[1.02] active:scale-95'
                : 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed shadow-none'
                }`}
            >
              <Zap className="w-5 h-5" />
              Scan & Extract
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-low rounded-2xl p-6 h-full border border-outline-variant/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold font-headline text-on-surface-variant">Image Preview</h3>
              <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">Front View</span>
            </div>

            <div className="aspect-[1.58/1] w-full rounded-xl overflow-hidden shadow-md bg-white mb-4 relative group">
              {preview ? (
                <img
                  src={preview}
                  alt="Aadhaar Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                  <ImageIcon className="w-12 h-12 text-on-surface-variant/20" />
                </div>
              )}
              {preview && (
                <div className="absolute inset-0 flex items-center justify-center bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white rounded-full text-on-surface shadow-lg">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="aspect-[1.58/1] w-full rounded-xl overflow-hidden shadow-inner bg-surface-container-highest flex items-center justify-center border-2 border-white">
              <div className="text-center p-4">
                <ImagePlus className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">Back side optional</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-outline-variant/20">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full ${preview ? 'bg-secondary animate-pulse' : 'bg-on-surface-variant/20'}`}></div>
                <span className="text-xs font-bold text-on-surface-variant">OCR Engine: V2.4 Active</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/60 leading-relaxed italic">
                * Ensure the image is well-lit and all four corners of the card are visible for 99.9% extraction accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
