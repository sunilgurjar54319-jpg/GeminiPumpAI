import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

function ImageCropModal({ image, onCancel, onApply }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function createCroppedImage() {
    if (!croppedAreaPixels) return;

    const result = await getCroppedImg(
      image,
      croppedAreaPixels,
      rotation
    );

    onApply(result);
  }

  return (
    <div className="image-crop-overlay">
      <div className="image-crop-modal">
        <div className="image-crop-header">
          <h3>Adjust Profile Picture</h3>
          <button type="button" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="image-crop-container">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="image-crop-controls">
          <label>
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <label>
            Rotate
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="image-crop-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>

          <button type="button" onClick={createCroppedImage}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const radians = (rotation * Math.PI) / 180;

      // Calculate the bounding box needed for the rotated image.
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));

      const rotatedWidth =
        Math.floor(image.width * cos + image.height * sin);

      const rotatedHeight =
        Math.floor(image.width * sin + image.height * cos);

      // Canvas containing the complete rotated image.
      const rotatedCanvas = document.createElement("canvas");
      rotatedCanvas.width = rotatedWidth;
      rotatedCanvas.height = rotatedHeight;

      const rotatedCtx = rotatedCanvas.getContext("2d");

      if (!rotatedCtx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      rotatedCtx.rotate(radians);

      rotatedCtx.drawImage(
        image,
        -image.width / 2,
        -image.height / 2
      );

      // Canvas containing EXACTLY the crop selected by react-easy-crop.
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = Math.round(pixelCrop.width);
      outputCanvas.height = Math.round(pixelCrop.height);

      const outputCtx = outputCanvas.getContext("2d");

      if (!outputCtx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      outputCtx.drawImage(
        rotatedCanvas,
        Math.round(pixelCrop.x),
        Math.round(pixelCrop.y),
        Math.round(pixelCrop.width),
        Math.round(pixelCrop.height),
        0,
        0,
        Math.round(pixelCrop.width),
        Math.round(pixelCrop.height)
      );

      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not create cropped image"));
            return;
          }

          resolve(
            new File(
              [blob],
              "profile-picture.jpg",
              { type: "image/jpeg" }
            )
          );
        },
        "image/jpeg",
        0.92
      );
    };

    image.onerror = () => {
      reject(new Error("Could not load image"));
    };

    image.src = imageSrc;
  });
}

export default ImageCropModal;
