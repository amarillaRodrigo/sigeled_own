import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import {
    FiZoomIn,
    FiZoomOut,
    FiDownload,
    FiRefreshCw,
    FiMaximize2,
    FiMinimize2,
} from "react-icons/fi";
import LoadingState from "./LoadingState";
import * as pdfjsLib from "pdfjs-dist";

import "pdfjs-dist/build/pdf.worker.mjs";

// Helpers para tipo/extensión
const getFileExtensionFromUrl = (url) => {
    if (!url) return null;
    try {
        const clean = url.split("?")[0].split("#")[0];
        const parts = clean.split(".");
        if (parts.length < 2) return null;
        return parts.pop().toLowerCase();
    } catch {
        return null;
    }
};

const getFileTypeFromUrl = (url) => {
    const ext = getFileExtensionFromUrl(url);
    if (!ext) return "unknown";
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "image";
    return "unknown";
};

export default function PdfPreviewModal({ url, title, onClose }) {
    const containerRef = useRef(null);
    const canvasRefs = useRef({});

    const [pdfDoc, setPdfDoc] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const fileType = getFileTypeFromUrl(url);
    const fileExt = getFileExtensionFromUrl(url);

    // Carga de PDF (solo si es pdf)
    useEffect(() => {
        if (!url) return;

        let cancelled = false;

        // Reset de estado común
        setError(null);
        setPdfDoc(null);
        setPageCount(0);
        setCurrentPage(1);
        canvasRefs.current = {};

        if (fileType !== "pdf") {
            // Para imágenes / desconocidos no usamos pdfjs
            setLoading(false);
            return () => {
                cancelled = true;
            };
        }

        setLoading(true);

        const loadingTask = pdfjsLib.getDocument(url);

        loadingTask.promise
            .then((doc) => {
                if (cancelled) return;
                setPdfDoc(doc);
                setPageCount(doc.numPages);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err?.message?.includes("Loading aborted")) {
                    console.debug(
                        "Carga de PDF abortada (modo dev / StrictMode)."
                    );
                    return;
                }

                console.error("Error al cargar PDF:", err);
                setError("No se pudo cargar el documento PDF.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            try {
                loadingTask.destroy?.();
            } catch (e) {}
        };
    }, [url, fileType]);

    // Renderizado de todas las páginas PDF
    useEffect(() => {
        if (fileType !== "pdf" || !pdfDoc || pageCount === 0) return;

        let cancelled = false;

        const renderAllPages = async () => {
            try {
                const totalPages = pdfDoc.numPages;
                const outputScale = window.devicePixelRatio || 1;

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    if (cancelled) break;

                    const canvas = canvasRefs.current[pageNum];
                    if (!canvas) continue;

                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale, rotation });
                    const context = canvas.getContext("2d");

                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;

                    const renderContext = {
                        canvasContext: context,
                        viewport,
                        transform:
                            outputScale !== 1
                                ? [outputScale, 0, 0, outputScale, 0, 0]
                                : null,
                    };

                    await page.render(renderContext).promise;
                }
            } catch (err) {
                if (err?.name !== "RenderingCancelledException") {
                    console.error("Error renderizando páginas:", err);
                }
            }
        };

        renderAllPages();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, pageCount, scale, rotation, fileType]);

    // Observa qué página está visible (solo PDF)
    useEffect(() => {
        if (fileType !== "pdf") return;
        const container = containerRef.current;
        if (!container || pageCount === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                let bestPage = currentPage;
                let bestRatio = 0;

                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        entry.intersectionRatio > bestRatio
                    ) {
                        bestRatio = entry.intersectionRatio;
                        const page = Number(entry.target.dataset.page);
                        if (page) bestPage = page;
                    }
                });

                if (bestRatio > 0) {
                    setCurrentPage(bestPage);
                }
            },
            {
                root: container,
                threshold: [0.15, 0.3, 0.5, 0.75],
            }
        );

        const pageElements =
            container.querySelectorAll(".pdf-page-container");
        pageElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [pageCount, currentPage, fileType]);

    const handleZoomIn = () => {
        setScale((prev) => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleDownload = async () => {
        if (!url) return;

        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error("No se pudo descargar el archivo.");

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;

            const ext =
                fileExt ||
                (fileType === "pdf"
                    ? "pdf"
                    : fileType === "image"
                    ? "jpg"
                    : "");
            a.download = (title || "documento") + (ext ? `.${ext}` : "");

            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Error al descargar archivo:", err);
        }
    };

    const toggleFullScreen = () => {
        setIsFullScreen((prev) => !prev);
        if (!isFullScreen && containerRef.current) {
            containerRef.current.scrollTo({ top: 0 });
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-90">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className={`relative z-10 flex flex-col bg-[#101922] shadow-2xl overflow-hidden transition-all duration-200
                    ${
                        isFullScreen
                            ? "w-screen h-screen border-0 rounded-none"
                            : "w-[95%] h-[90%] border border-[#1b2a37] rounded-2xl"
                    }`}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#0b1420] border-b border-[#1b2a37]">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-semibold text-white truncate max-w-[50vw]">
                            {title || "Previsualización de documento"}
                        </h3>
                        {fileType === "pdf" && pageCount > 0 && (
                            <span className="text-xs text-gray-400">
                                Página {currentPage} de {pageCount}
                            </span>
                        )}
                        {fileType === "image" && (
                            <span className="text-xs text-gray-400">
                                Imagen ({fileExt || "formato desconocido"})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Controles de zoom / rotación (funcionan para PDF e imágenes) */}
                        <div className="flex items-center gap-1 bg-[#1A2430] rounded-lg px-2 py-1 mr-2">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 hover:text-[#19F124] transition cursor-pointer"
                            >
                                <FiZoomOut />
                            </button>
                            <span className="text-xs min-w-[4ch] text-center cursor-default">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="p-2 hover:text-[#19F124] transition cursor-pointer"
                            >
                                <FiZoomIn />
                            </button>
                            <button
                                onClick={handleRotate}
                                className="p-2 hover:text-[#19F124] transition cursor-pointer"
                                title="Rotar 90°"
                            >
                                <FiRefreshCw />
                            </button>
                        </div>

                        <button
                            onClick={toggleFullScreen}
                            className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg bg-[#1A2430] hover:bg-[#253342] text-sm text-gray-100 transition"
                        >
                            {isFullScreen ? <FiMinimize2 /> : <FiMaximize2 />}
                            <span className="hidden sm:inline">
                                {isFullScreen
                                    ? "Salir de pantalla completa"
                                    : "Pantalla completa"}
                            </span>
                        </button>

                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer bg-[#1A2430] hover:bg-[#253342] text-sm text-gray-100 transition"
                        >
                            <FiDownload className="text-base" />
                            <span className="hidden sm:inline">
                                Descargar
                            </span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[#1A2430] hover:text-red-500 cursor-pointer transition"
                        >
                            <IoClose size={22} />
                        </button>
                    </div>
                </div>

                {/* CONTENIDO */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-[#050b10] p-6 sm:p-8 relative"
                >
                    {/* Loader (solo lo usamos para PDF) */}
                    {loading && (
                        <div className="flex items-center justify-center w-full h-full">
                            <LoadingState />
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="w-full max-w-md p-6 text-center border bg-red-900/20 rounded-xl border-red-500/30">
                                <p className="font-semibold text-red-500">
                                    {error}
                                </p>
                                <p className="mt-2 text-sm text-gray-400">
                                    Es posible que el archivo esté dañado, la
                                    URL haya expirado o el tipo no esté
                                    soportado.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* PDF */}
                    {!loading &&
                        !error &&
                        fileType === "pdf" &&
                        pageCount > 0 && (
                            <div className="flex flex-col items-center gap-6">
                                {Array.from(
                                    { length: pageCount },
                                    (_, index) => {
                                        const pageNumber = index + 1;
                                        return (
                                            <div
                                                key={pageNumber}
                                                data-page={pageNumber}
                                                className="overflow-hidden rounded-lg shadow-2xl pdf-page-container bg-black/30"
                                            >
                                                <canvas
                                                    ref={(el) => {
                                                        if (el) {
                                                            canvasRefs.current[
                                                                pageNumber
                                                            ] = el;
                                                        }
                                                    }}
                                                    className="block"
                                                />
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}

                    {/* IMAGEN */}
                    {!error && fileType === "image" && (
                        <div className="flex items-center justify-center w-full h-full">
                            <img
                                src={url}
                                alt={
                                    title || "Vista previa de imagen del archivo"
                                }
                                className="block max-w-full max-h-[80vh] mx-auto rounded-lg shadow-2xl"
                                style={{
                                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                                    transformOrigin: "center center",
                                    transition: "transform 0.2s ease-out",
                                }}
                                onError={(e) => {
                                    console.error(
                                        "Error al cargar imagen:",
                                        e
                                    );
                                    setError("No se pudo cargar la imagen.");
                                }}
                            />
                        </div>
                    )}

                    {/* Tipo desconocido sin error (ej. sin extensión) */}
                    {!loading &&
                        !error &&
                        fileType === "unknown" &&
                        url && (
                            <div className="flex items-center justify-center w-full h-full">
                                <div className="w-full max-w-md p-6 text-center border bg-[#1a2533] rounded-xl border-[#2b3b4a]">
                                    <p className="font-semibold text-white">
                                        Tipo de archivo no soportado
                                    </p>
                                    <p className="mt-2 text-sm text-gray-400 break-all">
                                        No se pudo determinar cómo mostrar este
                                        archivo.
                                    </p>
                                </div>
                            </div>
                        )}
                </div>

                {/* FOOTER (solo PDF) */}
                {fileType === "pdf" && pageCount > 0 && (
                    <div className="px-6 py-3 bg-[#0b1420] border-t border-[#1b2a37] flex items-center justify-between text-xs text-gray-400">
                        <span>
                            Página{" "}
                            <span className="font-bold text-white">
                                {currentPage}
                            </span>{" "}
                            de{" "}
                            <span className="font-bold text-white">
                                {pageCount}
                            </span>
                        </span>
                        <span className="hidden sm:inline">
                            Desplazate con el scroll para navegar entre
                            páginas.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
