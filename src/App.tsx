/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Sun, 
  Contrast, 
  Droplet, 
  Image as ImageIcon,
  Maximize,
  Check,
  RotateCcw,
  Palette,
  AlertCircle,
  X,
  Camera,
  Layers,
  Grid,
  ShoppingBag,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [hue, setHue] = useState(0);

  const [selectedStyle, setSelectedStyle] = useState('studio');
  const [selectedAngles, setSelectedAngles] = useState(['eye-level']);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setErrorMessage(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Trình duyệt của bạn không hỗ trợ truy cập camera. Vui lòng thử trình duyệt khác (như Chrome hoặc Safari).");
      return;
    }

    try {
      setIsCameraActive(true); // Set active first to ensure video element is rendered
      
      // Wait for next tick to ensure videoRef is available
      setTimeout(async () => {
        try {
          let stream;
          // Try with environment camera first (back camera)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
              } 
            });
          } catch (e) {
            console.log("Environment camera failed, trying default camera...");
            // Fallback to any available camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure video starts playing
            try {
              await videoRef.current.play();
            } catch (playError) {
              console.error("Error playing video:", playError);
            }
          }
        } catch (innerErr: any) {
          console.error("Inner camera error:", innerErr);
          setIsCameraActive(false);
          handleCameraError(innerErr);
        }
      }, 100);
    } catch (err: any) {
      console.error("Outer camera error:", err);
      setIsCameraActive(false);
      handleCameraError(err);
    }
  };

  const handleCameraError = (err: any) => {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('dismissed')) {
      setErrorMessage("Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.");
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setErrorMessage("Không tìm thấy camera trên thiết bị này.");
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      setErrorMessage("Camera đang được sử dụng bởi một ứng dụng khác.");
    } else {
      setErrorMessage("Lỗi truy cập camera: " + (err.message || "Không rõ nguyên nhân"));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setOriginalImage(dataUrl);
        setBase64Image(dataUrl.split(',')[1]);
        setResults([]);
        setErrorMessage(null);
        stopCamera();
      }
    }
  };

  // Danh sách bối cảnh quảng cáo chuyên nghiệp đã được mở rộng
  const styles = [
    { id: 'studio', name: 'Studio Trắng', prompt: 'clean professional white studio background, soft shadows, 8k commercial photography, minimalist' },
    { id: 'marble', name: 'Đá Cẩm Thạch', prompt: 'placed on a luxury white marble surface, soft elegant lighting, blurred boutique background' },
    { id: 'silk', name: 'Lụa Sang Trọng', prompt: 'resting on soft draped silk fabric, elegant curves, high-end perfume/jewelry style lighting, luxury aesthetic' },
    { id: 'pop-art', name: 'Màu Nổi (Social)', prompt: 'vibrant solid orange and teal split background, pop art style, sharp shadows, perfect for social media ads' },
    { id: 'tech', name: 'Công Nghệ Tối', prompt: 'dark brushed metal surface, blue neon rim lighting, high-tech laboratory vibe, futuristic' },
    { id: 'wood', name: 'Bàn Gỗ Ấm', prompt: 'on a rustic oak wooden table, warm sunlight filtering through a window, cozy home atmosphere' },
    { id: 'kitchen', name: 'Bếp Hiện Đại', prompt: 'on a clean kitchen granite countertop, blurred modern kitchen background, bright morning light' },
    { id: 'industrial', name: 'Bê Tông/Street', prompt: 'on a raw concrete floor, industrial brick wall background, cool street style lighting, urban fashion vibe' },
    { id: 'nature', name: 'Thiên Nhiên', prompt: 'on a smooth stone near a stream, moss and green leaves in background, natural morning light, organic' },
    { id: 'beach', name: 'Bãi Biển/Hè', prompt: 'placed on white sand, tropical leaves shadows, bright summer sunlight, turquoise ocean background' }
  ];

  const angles = [
    { id: 'eye-level', name: 'Chính diện', description: 'shot at eye level, straight-on perspective' },
    { id: 'top-down', name: 'Từ trên xuống', description: 'shot from directly above, flat lay style, top-down perspective' },
    { id: 'low-angle', name: 'Góc thấp', description: 'shot from a low angle looking up, making the product look heroic and grand' },
    { id: 'close-up', name: 'Cận cảnh', description: 'extreme close-up shot, shallow depth of field, focusing on textures and details' },
    { id: 'side-view', name: 'Góc nghiêng', description: 'shot from a 45-degree side angle, showing depth and dimension' }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setOriginalImage(result);
        setBase64Image(result.split(',')[1]);
        setResults([]); 
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAngle = (id: string) => {
    setSelectedAngles(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const generateImages = async () => {
    if (!base64Image || selectedAngles.length === 0) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    const newResults = selectedAngles.map(angleId => ({
      id: Math.random().toString(36).substr(2, 9),
      angleId,
      angleName: angles.find(a => a.id === angleId)?.name,
      url: null,
      status: 'loading'
    }));
    setResults(newResults);

    // API Keys provided by user for permanent storage
    const FIXED_KEYS = [
      "AIzaSyAPHZOXOUdLACfDN3PyUhmdn04RNfmt554",
      "AIzaSyB80DnOCvSNQDBBbCCk5eC6-JyfV4t4278"
    ];

    // Use environment variable if available, otherwise rotate through fixed keys
    const apiKey = process.env.GEMINI_API_KEY || FIXED_KEYS[Math.floor(Math.random() * FIXED_KEYS.length)];
    
    if (!apiKey) {
      setErrorMessage("Không tìm thấy API Key. Vui lòng kiểm tra lại cấu hình.");
      setIsProcessing(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    for (let i = 0; i < newResults.length; i++) {
      const currentResult = newResults[i];
      const styleInfo = styles.find(s => s.id === selectedStyle);
      const angleInfo = angles.find(a => a.id === currentResult.angleId);
      
      const prompt = `Professional product advertisement photography: 
      1. MAIN OBJECT: Maintain the product from the source image exactly.
      2. BACKGROUND: ${styleInfo?.prompt}.
      3. PERSPECTIVE: ${angleInfo?.description}.
      4. LIGHTING: Ensure hyper-realistic commercial lighting, matching shadows, and reflections. 
      ${customPrompt ? 'Extra requirements: ' + customPrompt : ''}
      Output: 8k resolution, highly detailed, professional ad quality.`;

      const fetchWithRetry = async (retries = 3, delay = 2000): Promise<string> => {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/png", data: base64Image } }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: "1:1",
              }
            }
          });

          let generatedBase64 = "";
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              generatedBase64 = part.inlineData.data;
              break;
            }
          }

          if (!generatedBase64) throw new Error("No image data returned from AI");
          return generatedBase64;
        } catch (error) {
          if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(retries - 1, delay * 2);
          }
          throw error;
        }
      };

      try {
        const resultBase64 = await fetchWithRetry();
        setResults(prev => prev.map(item => 
          item.id === currentResult.id 
            ? { ...item, url: `data:image/png;base64,${resultBase64}`, status: 'done' }
            : item
        ));
      } catch (error: any) {
        console.error("Generation error:", error);
        setResults(prev => prev.map(item => 
          item.id === currentResult.id 
            ? { ...item, status: 'error' }
            : item
        ));
      }
    }
    setIsProcessing(false);
  };

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${hue}deg)`
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-900">
      {/* Header */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm shadow-slate-100/50">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            className="bg-white p-1 rounded-full shadow-md border border-slate-100 flex items-center justify-center overflow-hidden"
          >
            <img 
              src="https://lh3.googleusercontent.com/d/1TmSXSk04LWEVPPYxiS0joFGUAjYuAoNe" 
              className="w-10 h-10 object-contain" 
              alt="San San Logo"
              onError={(e) => {
                // Fallback to a placeholder if the image fails to load
                e.currentTarget.src = "https://picsum.photos/seed/sansan/64/64";
              }}
            />
          </motion.div>
          <div>
            <h1 className="font-black text-lg leading-none fresh-text-gradient">Studio Quảng Cáo AI</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Professional Ads Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {results.some(r => r.status === 'done') && (
             <motion.span 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full border border-violet-100"
             >
               Đã xong: {results.filter(r => r.status === 'done').length}/{results.length}
             </motion.span>
           )}
        </div>
      </nav>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-[400px] bg-white/50 backdrop-blur-sm border-r border-slate-100 overflow-y-auto p-6 space-y-8 custom-scrollbar shadow-inner">
          <section className="space-y-4">
            <div className="relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-violet-400 hover:shadow-md">
              {isCameraActive ? (
                <div className="relative w-full h-full">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <button 
                      onClick={capturePhoto}
                      className="fresh-gradient text-white p-3 rounded-full shadow-lg hover:shadow-violet-200 transition-all active:scale-90"
                    >
                      <Camera size={20} />
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="bg-white text-slate-600 p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all active:scale-90"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : originalImage ? (
                <div className="relative w-full h-full">
                  <img src={originalImage} className="w-full h-full object-contain p-2" alt="Source" />
                  <button 
                    onClick={() => { setOriginalImage(null); setBase64Image(null); }}
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-lg text-slate-500 hover:text-rose-500 transition-all shadow-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50/30 transition-all">
                  <div className="bg-violet-50 p-4 rounded-2xl mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="text-violet-500" size={24} />
                  </div>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">Tải ảnh sản phẩm gốc</p>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG (Tối đa 5MB)</p>
                  <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
              )}
            </div>
            
            {!isCameraActive && !originalImage && (
              <div className="space-y-2">
                <button 
                  onClick={startCamera}
                  className="w-full py-3 rounded-2xl border border-slate-100 bg-white text-slate-600 text-xs font-bold hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Camera size={16} /> CHỤP ẢNH TRỰC TIẾP
                </button>
                <p className="text-[9px] text-slate-400 text-center font-medium">
                  Mẹo: Nếu camera không hoạt động, hãy thử <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">mở ứng dụng trong tab mới</a>.
                </p>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </section>

          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl relative">
            <motion.div 
              layoutId="tab-bg"
              className="absolute inset-y-1.5 bg-white shadow-sm rounded-xl"
              style={{ 
                width: 'calc(50% - 3px)',
                left: activeTab === 'ai' ? '3px' : 'calc(50% + 1.5px)'
              }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
            <button 
              onClick={() => setActiveTab('ai')} 
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-colors relative z-10 ${activeTab === 'ai' ? 'text-violet-600' : 'text-slate-500'}`}
            >
              Thiết kế AI
            </button>
            <button 
              onClick={() => setActiveTab('edit')} 
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-colors relative z-10 ${activeTab === 'edit' ? 'text-violet-600' : 'text-slate-500'}`}
            >
              Hậu kỳ
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'ai' ? (
              <motion.div 
                key="ai-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <ShoppingBag size={14} className="text-violet-500" /> 1. Bối cảnh bán hàng
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {styles.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className={`p-3 rounded-xl border-2 text-[11px] font-bold text-left leading-tight transition-all relative overflow-hidden ${selectedStyle === s.id ? 'border-violet-600 bg-violet-50 text-violet-600 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-slate-200'}`}
                      >
                        {s.name}
                        {selectedStyle === s.id && <div className="absolute top-1 right-1"><Check size={12} /></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-500" /> 2. Ý tưởng riêng của bạn (Tùy chọn)
                  </h4>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ví dụ: Thêm cánh hoa hồng rơi, ánh sáng hoàng hôn, sương mù nhẹ..."
                    className="w-full h-24 p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-50 text-xs font-medium text-slate-600 focus:border-violet-400 focus:bg-white transition-all outline-none resize-none custom-scrollbar"
                  />
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Camera size={14} className="text-violet-500" /> 3. Góc máy camera ({selectedAngles.length})
                  </h4>
                  <div className="space-y-2">
                    {angles.map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleAngle(a.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-sm font-bold transition-all ${selectedAngles.includes(a.id) ? 'border-violet-600 bg-violet-50 text-violet-600' : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-slate-200'}`}
                      >
                        {a.name}
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${selectedAngles.includes(a.id) ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-300'}`}>
                          {selectedAngles.includes(a.id) && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={generateImages}
                    disabled={isProcessing || !originalImage || selectedAngles.length === 0}
                    className="w-full fresh-gradient hover:opacity-90 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 text-white py-4 rounded-2xl font-black shadow-xl shadow-violet-100 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                  >
                    {isProcessing ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                        TẠO BỘ ẢNH QUẢNG CÁO
                      </>
                    )}
                  </button>
                  {errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                      <AlertCircle className="text-red-500 shrink-0" size={16} />
                      <p className="text-[10px] text-red-600 font-bold">{errorMessage}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="edit-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                 {[
                  { label: 'Độ sáng', val: brightness, set: setBrightness, icon: <Sun size={14} /> },
                  { label: 'Tương phản', val: contrast, set: setContrast, icon: <Contrast size={14} /> },
                  { label: 'Bão hòa', val: saturation, set: setSaturation, icon: <Droplet size={14} /> },
                  { label: 'Độ mờ', val: blur, set: setBlur, max: 10, icon: <Maximize size={14} /> }
                ].map(f => (
                  <div key={f.label} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-2">{f.icon} {f.label}</span>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{f.val}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={f.max || 200} 
                      value={f.val} 
                      onChange={e => f.set(Number(e.target.value))} 
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600" 
                    />
                  </div>
                ))}
                <button 
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); }} 
                  className="w-full py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> ĐẶT LẠI THÔNG SỐ
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Workspace Gallery */}
        <section className="flex-grow p-8 overflow-y-auto bg-transparent custom-scrollbar">
          {!results.length && !isProcessing ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-slate-300"
            >
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6 border border-slate-100">
                <Grid size={40} className="opacity-20" />
              </div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Thư viện ảnh trống</p>
              <p className="text-xs mt-2 font-medium">Chọn bối cảnh & góc máy để bắt đầu</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
              <AnimatePresence>
                {results.map((result) => (
                  <motion.div 
                    key={result.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 group transition-all hover:shadow-2xl hover:shadow-violet-100/50 hover:-translate-y-1"
                  >
                    <div className="aspect-square rounded-[2rem] bg-slate-50 mb-4 overflow-hidden relative flex items-center justify-center border border-slate-100">
                      {result.status === 'loading' ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <RefreshCw className="animate-spin text-violet-600" size={32} />
                            <Sparkles className="absolute -top-2 -right-2 text-violet-400 animate-pulse" size={16} />
                          </div>
                          <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Đang thiết kế...</span>
                        </div>
                      ) : result.status === 'error' ? (
                        <div className="text-center p-6">
                          <AlertCircle className="text-red-400 mx-auto mb-2" size={32} />
                          <span className="text-xs text-red-500 font-bold uppercase">Lỗi xử lý AI</span>
                        </div>
                      ) : (
                        <motion.img 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          src={result.url} 
                          style={filterStyle}
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                          alt={result.angleName}
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                          {styles.find(s => s.id === selectedStyle)?.name}
                        </span>
                        <span className="text-sm font-black text-slate-800">{result.angleName}</span>
                      </div>
                      {result.status === 'done' && (
                        <button 
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = result.url;
                            a.download = `ad-photo-${result.angleId}.png`;
                            a.click();
                          }}
                          className="p-3 bg-slate-900 text-white rounded-xl hover:bg-violet-600 transition-all shadow-lg shadow-slate-200"
                          title="Tải xuống"
                        >
                          <Download size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
      
      {/* Footer Info */}
      <footer className="bg-white/70 backdrop-blur-md border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Info size={12} className="text-violet-400" /> Powered by Gemini 2.5 Flash</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Professional Output</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-bold uppercase border border-violet-100">System Ready</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
