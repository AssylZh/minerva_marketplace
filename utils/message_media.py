"""Save and validate message image uploads (shared rules with listing uploads)."""
import os
import uuid

from werkzeug.datastructures import FileStorage

ALLOWED_EXTENSIONS = frozenset({"png", "jpg", "jpeg", "gif", "webp"})
MAX_MESSAGE_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB, same cap as item images


def _magic_matches_image(header: bytes) -> bool:
    if len(header) < 12:
        return False
    if header.startswith(b"\xff\xd8\xff"):
        return True
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return True
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return True
    return False


def save_message_image(file_storage: FileStorage, upload_dir: str) -> str:
    """
    Validate extension, size, and image magic bytes; save to Cloudinary or local.
    Returns public URL.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("No image file provided.")
    ext = file_storage.filename.rsplit(".", 1)[-1].lower() if "." in file_storage.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type not allowed. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_MESSAGE_IMAGE_BYTES:
        raise ValueError("File too large. Maximum size is 5 MB.")

    header = file_storage.read(32)
    file_storage.seek(0)
    if not _magic_matches_image(header):
        raise ValueError("File is not a valid image.")

    cloudinary_url = os.environ.get("CLOUDINARY_URL")
    if cloudinary_url:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(cloudinary_url=cloudinary_url)
        result = cloudinary.uploader.upload(file_storage, folder="minerva-marketplace/messages")
        return result["secure_url"]

    os.makedirs(upload_dir, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    dest = os.path.join(upload_dir, name)
    file_storage.save(dest)
    return f"/uploads/messages/{name}"
