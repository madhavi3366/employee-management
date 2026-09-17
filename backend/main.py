from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
)

from openpyxl import load_workbook

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    RedirectResponse,
)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime
import mimetypes
import subprocess

import os
import tempfile
import uuid
import json
import html
import shutil

from pathlib import Path

from database import (
    engine,
    Base,
    SessionLocal,
)

from models import (
    Employee,
    ImportHistory,
    ExpenseFile,
)

from excel_import import import_excel

from openpyxl.utils import get_column_letter

# ============================================================
# CREATE DATABASE TABLES
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="HR Dashboard API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# CONSTANTS
# ============================================================

VALID_TEAMS = [
    "Networking",
    "AI",
    "HR",
    "Accounts",
    "Administration",
]


VALID_PAYROLL_TYPES = [
    "Salary",
    "Stipend",
]


TEAM_DESCRIPTIONS = {
    "Networking": (
        "Network infrastructure, systems and operations"
    ),

    "AI": (
        "Artificial intelligence, machine learning "
        "and automation"
    ),

    "HR": (
        "Human resources, employee relations, "
        "recruitment and HR operations"
    ),

    "Accounts": (
        "Financial operations, accounting, billing "
        "and company finances"
    ),

    "Administration": (
        "Office administration, facilities and "
        "organizational operations"
    ),
}


# ============================================================
# NORMALIZE TEAM
# ============================================================

def normalize_team(team):
    if not team:
        return None
    t = str(team).strip()
    if not t:
        return None
    for valid in VALID_TEAMS:
        if valid.lower() == t.lower() or valid.lower().startswith(t.lower()):
            return valid
    return None

# ============================================================
# INVALID TEAM MESSAGE
# ============================================================

def invalid_team_message():
    return f"Invalid team. Valid teams: {', '.join(VALID_TEAMS)}"

# ============================================================
# NORMALIZE PAYROLL TYPE
# ============================================================

def normalize_payroll_type(payroll_type):
    if not payroll_type:
        return None
    p = str(payroll_type).strip()
    if not p:
        return None
    for valid in VALID_PAYROLL_TYPES:
        if valid.lower() == p.lower() or valid.lower().startswith(p.lower()):
            return valid
    return None

    # --------------------------------------------------------
    # NETWORKING
    # --------------------------------------------------------

    if (
        value == "networking"
        or value == "network"
        or "network infrastructure" in value
        or value.startswith("network")
    ):
        return "Networking"

    # --------------------------------------------------------
    # AI
    # --------------------------------------------------------

    if (
        value == "ai"
        or value == "a.i."
        or value == "artificial intelligence"
        or "artificial intelligence" in value
        or "machine learning" in value
    ):
        return "AI"

    # --------------------------------------------------------
    # HR
    # --------------------------------------------------------

    if (
        value == "hr"
        or value == "human resource"
        or value == "human resources"
        or "human resource" in value
        or value.startswith("hr ")
    ):
        return "HR"

    # --------------------------------------------------------
    # ACCOUNTS
    # --------------------------------------------------------

    if (
        value == "account"
        or value == "accounts"
        or value == "accounting"
        or "accounting" in value
        or "finance" in value
        or "financial" in value
    ):
        return "Accounts"

    # --------------------------------------------------------
    # ADMINISTRATION
    # --------------------------------------------------------

    if (
        value == "admin"
        or value == "administration"
        or value == "administrative"
        or "administration" in value
        or "administrative" in value
    ):
        return "Administration"

    return None


# ============================================================
# INVALID TEAM MESSAGE
# ============================================================

def invalid_team_message():
    return (
        "Invalid team. Allowed teams are: "
        + ", ".join(VALID_TEAMS)
    )


# ============================================================
# NORMALIZE PAYROLL TYPE
# ============================================================

def normalize_payroll_type(payroll_type):

    if payroll_type is None:
        return None

    value = str(
        payroll_type
    ).strip().lower()

    if not value:
        return None

    if (
        value == "salary"
        or value == "salaried"
        or value == "employee"
    ):
        return "Salary"

    if (
        value == "stipend"
        or value == "stipendiary"
        or value == "intern"
        or value == "internship"
    ):
        return "Stipend"

    return None


# ============================================================
# INVALID PAYROLL TYPE MESSAGE
# ============================================================

def invalid_payroll_type_message():

    return (
        "Invalid payroll type. Allowed payroll types are: "
        + ", ".join(VALID_PAYROLL_TYPES)
    )


# ============================================================
# ACTIVE EMPLOYEE HELPER
# ============================================================

def is_active_employee(employee):

    if not employee:
        return False

    status = getattr(
        employee,
        "status",
        None,
    )

    if status is None:
        return False

    return (
        str(status)
        .strip()
        .lower()
        == "active"
    )


# ============================================================
# PAYROLL EXCEL ARCHIVE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

PAYROLL_FOLDER = (
    BASE_DIR / "payroll_files"
)

PAYROLL_INDEX_FILE = (
    PAYROLL_FOLDER / "index.json"
)

PAYROLL_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# COMPANY EXPENSES STORAGE (separate from payroll_files)
# ============================================================

EXPENSES_BASE = BASE_DIR / "uploads" / "expenses"
EXPENSES_BASE.mkdir(parents=True, exist_ok=True)

MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
]

ALLOWED_EXPENSE_EXTENSIONS = {
    ".xlsx", ".xls", ".pdf", ".csv", ".docx", ".doc",
    ".jpg", ".jpeg", ".png"
}

def normalize_month(name):
    if not name:
        return None
    n = str(name).strip()
    if not n:
        return None
    # numeric month
    if n.isdigit():
        m = int(n)
        if 1 <= m <= 12:
            return MONTH_NAMES[m-1]
        return None
    # exact or prefix match
    for m in MONTH_NAMES:
        if m.lower() == n.lower() or m.lower().startswith(n.lower()):
            return m
    return None

def get_expense_folder(year: int, month: str = None):
    year_folder = EXPENSES_BASE / str(year)
    if month:
        month_folder = year_folder / month
        return year_folder, month_folder
    return year_folder, None

def expense_file_response(record):
    return {
        "id": record.id,
        "year": record.year,
        "month": record.month,
        "original_filename": record.original_filename,
        "stored_filename": record.stored_filename,
        "file_type": record.file_type,
        "file_size": record.file_size,
        "uploaded_at": record.uploaded_at.isoformat() if record.uploaded_at else None,
        "status": record.status,
        "download_url": f"/expenses/{record.year}/{record.month}/files/{record.id}/download",
        "delete_url": f"/expenses/{record.year}/{record.month}/files/{record.id}",
    }

# ============================================================
# EXPENSES: YEARS
# ============================================================

@app.get("/expenses/years")
def list_expense_years(db: Session = Depends(get_db)):
    years_db = [r[0] for r in db.query(ExpenseFile.year).distinct().all()]
    years_fs = []
    try:
        for entry in EXPENSES_BASE.iterdir():
            if entry.is_dir() and entry.name.isdigit():
                years_fs.append(int(entry.name))
    except Exception:
        pass
    years = sorted(set(years_db + years_fs), reverse=True)
    response = []
    for y in years:
        count = db.query(ExpenseFile).filter(ExpenseFile.year == y).count()
        response.append({"year": y, "file_count": count})
    return response

@app.post("/expenses/years")
def create_expense_year(payload: dict, db: Session = Depends(get_db)):
    year = payload.get("year")
    try:
        year = int(year)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid year")
    if year < 1900 or year > 2100:
        raise HTTPException(status_code=400, detail="Year out of allowed range")
    year_folder, _ = get_expense_folder(year)
    try:
        year_folder.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create year folder")
    return {"message": "Year created", "year": year}


# ============================================================
# EXPENSES: DELETE YEAR
# Deletes:
#   - all database records for that year
#   - complete physical year folder
#   - all month folders
#   - all expense files inside those folders
# ============================================================

@app.delete("/expenses/{year}")
def delete_expense_year(
    year: int,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # VALIDATE YEAR
    # --------------------------------------------------------

    if year < 1900 or year > 2100:
        raise HTTPException(
            status_code=400,
            detail="Invalid year",
        )

    # --------------------------------------------------------
    # YEAR FOLDER
    # --------------------------------------------------------

    year_folder = EXPENSES_BASE / str(year)

    # --------------------------------------------------------
    # GET ALL DATABASE RECORDS FOR THIS YEAR
    # --------------------------------------------------------

    records = (
        db.query(ExpenseFile)
        .filter(
            ExpenseFile.year == year
        )
        .all()
    )

    deleted_files = len(records)

    # --------------------------------------------------------
    # DELETE DATABASE RECORDS
    # --------------------------------------------------------

    try:
        for record in records:
            db.delete(record)

        db.commit()

    except Exception as error:
        db.rollback()

        print(
            "Expense year database delete error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete expense records for this year",
        )

    # --------------------------------------------------------
    # DELETE COMPLETE YEAR FOLDER
    #
    # Example:
    #
    # uploads/
    #   expenses/
    #     2026/
    #       January/
    #       February/
    #       March/
    #       ...
    #
    # Everything inside 2026 is removed.
    # --------------------------------------------------------

    folder_deleted = False

    try:
        if year_folder.exists():
            shutil.rmtree(
                year_folder
            )

            folder_deleted = True

    except Exception as error:
        print(
            "Expense year folder delete error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Database records were deleted, "
                "but the physical year folder could not be removed."
            ),
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": "Expense year deleted successfully",
        "year": year,
        "deleted_files": deleted_files,
        "folder_deleted": folder_deleted,
    }

# ============================================================
# EXPENSES: MONTHS
# ============================================================

@app.get("/expenses/{year}/months")
def list_expense_months(year: int, db: Session = Depends(get_db)):
    months = []
    for m in MONTH_NAMES:
        count = db.query(ExpenseFile).filter(ExpenseFile.year == year, ExpenseFile.month == m).count()
        months.append({"month": m, "file_count": count})
    return months

@app.post("/expenses/{year}/months")
def create_expense_month(year: int, payload: dict, db: Session = Depends(get_db)):
    month_raw = payload.get("month")
    normalized = normalize_month(month_raw)
    if normalized is None:
        raise HTTPException(status_code=400, detail="Invalid month")
    year_folder, month_folder = get_expense_folder(year, normalized)
    try:
        month_folder.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create month folder")
    return {"message": "Month created", "year": year, "month": normalized}



# ============================================================
# EXPENSES: FILES (LIST / UPLOAD / DOWNLOAD / DELETE)
# ============================================================

@app.get("/expenses/{year}/{month}/files")
def list_expense_files(year: int, month: str, db: Session = Depends(get_db)):
    normalized = normalize_month(month)
    if normalized is None:
        raise HTTPException(status_code=404, detail="Invalid month")
    files = (
        db.query(ExpenseFile)
        .filter(ExpenseFile.year == year, ExpenseFile.month == normalized)
        .order_by(ExpenseFile.uploaded_at.desc())
        .all()
    )
    return [expense_file_response(f) for f in files]


@app.post("/expenses/{year}/{month}/files")
async def upload_expense_file(
    year: int,
    month: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    normalized = normalize_month(month)
    if normalized is None:
        raise HTTPException(status_code=400, detail="Invalid month")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXPENSE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")

    # duplicate original filename check
    existing = (
        db.query(ExpenseFile)
        .filter(
            ExpenseFile.year == year,
            ExpenseFile.month == normalized,
            ExpenseFile.original_filename == Path(file.filename).name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A file with this name already exists in the folder",
        )

    year_folder, month_folder = get_expense_folder(year, normalized)
    try:
        month_folder.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create storage folder")

    file_id = uuid.uuid4().hex
    stored_filename = f"{file_id}{extension}"
    stored_path = month_folder / stored_filename

    try:
        with open(stored_path, "wb") as out:
            out.write(contents)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save file")

    record = ExpenseFile(
        year=year,
        month=normalized,
        original_filename=Path(file.filename).name,
        stored_filename=stored_filename,
        file_type=extension.replace(".", "").upper(),
        file_size=len(contents),
        uploaded_at=datetime.now(),
        status="Available",
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        try:
            if stored_path.exists():
                stored_path.unlink(missing_ok=True)
        except Exception:
            pass
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to record file in database")

    return {"message": "File uploaded", **expense_file_response(record)}



@app.get("/expenses/{year}/{month}/files/{file_id}/download")
def download_expense_file(year: int, month: str, file_id: int, db: Session = Depends(get_db)):
    record = db.query(ExpenseFile).filter(ExpenseFile.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    safe_stored = Path(record.stored_filename).name
    file_path = EXPENSES_BASE / str(record.year) / record.month / safe_stored
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(path=str(file_path), filename=record.original_filename, media_type="application/octet-stream")


@app.get("/expenses/{year}/{month}/files/{file_id}/view")
def view_expense_file(year: int, month: str, file_id: int, db: Session = Depends(get_db)):
    record = db.query(ExpenseFile).filter(ExpenseFile.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    safe_stored = Path(record.stored_filename).name
    file_path = EXPENSES_BASE / str(record.year) / record.month / safe_stored
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    # If Excel .xlsx, return HTML preview (reuse payroll preview)
    suffix = file_path.suffix.lower()

    if suffix == ".xlsx":
        try:
            content = excel_to_html(
                file_path=str(file_path),
                filename=record.original_filename,
                file_id=str(record.id),
            )

            return HTMLResponse(content=content)
        except HTTPException:
            raise
        except Exception as e:
            print("Expense Excel preview error:", e)
            # fallback to download/view

    if suffix == ".xls":
        safe_filename = html.escape(str(record.original_filename))
        html_msg = f"""
<!DOCTYPE html>
<html><body style='font-family:Arial,sans-serif;padding:40px;background:#f3f4f6;'>
<div style='max-width:700px;margin:60px auto;background:white;padding:30px;border-radius:10px;'>
<h1>Excel Workbook</h1>
<p><strong>{safe_filename}</strong> is an old Excel .xls workbook. Browser preview is available for .xlsx files. Please download this workbook to open it in Excel.</p>
<a href="/expenses/{record.year}/{record.month}/files/{record.id}/download" style='display:inline-block;margin-top:12px;padding:10px 14px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;'>⬇ Download Excel File</a>
</div></body></html>
"""
        return HTMLResponse(content=html_msg)

    # Default: serve file inline if browser supports it, otherwise download
    mime_type, _ = mimetypes.guess_type(str(file_path))
    media_type = mime_type or "application/octet-stream"

    headers = {"Content-Disposition": f'inline; filename="{record.original_filename}"'}

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers=headers,
    )


@app.get("/expenses/{year}/{month}/files/{file_id}/render")
def render_expense_file(year: int, month: str, file_id: int, db: Session = Depends(get_db)):
    """
    Convert Office documents to PDF using LibreOffice (soffice) and serve PDF inline.
    Falls back to serving the original file if conversion is not supported or fails.
    """
    record = db.query(ExpenseFile).filter(ExpenseFile.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    safe_stored = Path(record.stored_filename).name
    month_folder = EXPENSES_BASE / str(record.year) / record.month
    file_path = month_folder / safe_stored
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    # If already PDF, serve directly
    if file_path.suffix.lower() == ".pdf":
        return FileResponse(path=str(file_path), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{record.original_filename}"'})

    # Supported office types for conversion
    office_exts = {".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
    if file_path.suffix.lower() not in office_exts:
        # Not convertible: serve via view endpoint (may download)
        mime_type, _ = mimetypes.guess_type(str(file_path))
        return FileResponse(path=str(file_path), media_type=mime_type or "application/octet-stream", headers={"Content-Disposition": f'inline; filename="{record.original_filename}"'})

    # Prepare PDF cache path
    pdf_name = file_path.stem + ".pdf"
    pdf_path = month_folder / pdf_name

    # If cached PDF exists, serve it
    if pdf_path.exists():
        return FileResponse(path=str(pdf_path), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{pdf_name}"'})

    # Attempt conversion with LibreOffice (soffice)
    try:
        outdir = str(month_folder)
        cmd = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", outdir, str(file_path)]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        # Check converted file
        possible_pdf = month_folder / (file_path.stem + ".pdf")
        if possible_pdf.exists():
            # Optionally rename/move to pdf_path (same)
            return FileResponse(path=str(possible_pdf), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{possible_pdf.name}"'})
        else:
            raise Exception("Conversion produced no PDF")
    except Exception as e:
        # Conversion failed: return original file (browser may download)
        print("Document conversion failed:", e)
        mime_type, _ = mimetypes.guess_type(str(file_path))
        return FileResponse(path=str(file_path), media_type=mime_type or "application/octet-stream", headers={"Content-Disposition": f'inline; filename="{record.original_filename}"'})

@app.delete("/expenses/{year}/{month}/files/{file_id}")
def delete_expense_file(year: int, month: str, file_id: int, db: Session = Depends(get_db)):
    record = db.query(ExpenseFile).filter(ExpenseFile.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    safe_stored = Path(record.stored_filename).name
    file_path = EXPENSES_BASE / str(record.year) / record.month / safe_stored
    try:
        if file_path.exists():
            file_path.unlink(missing_ok=True)
    except Exception:
        pass
    try:
        db.delete(record)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete file record")
    return {"message": "File deleted", "id": file_id}


# ============================================================
# ISO CERTIFICATIONS STORAGE
# ============================================================

ISO_BASE = (
    BASE_DIR
    / "uploads"
    / "iso_certifications"
)

ISO_BASE.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# SAFE ISO PATH
# ============================================================

def get_iso_path(relative_path=""):
    """
    Convert a relative ISO path into a safe
    filesystem path.

    Prevents ../ path traversal.
    """

    relative_path = (
        str(relative_path or "")
        .strip()
        .replace("\\", "/")
    )

    relative_path = relative_path.strip("/")

    base = ISO_BASE.resolve()

    if relative_path:
        target = (
            base / relative_path
        ).resolve()
    else:
        target = base

    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid folder path"
        )

    return target


# ============================================================
# ISO: LIST FOLDER
# ============================================================

@app.get(
    "/iso/items/{folder_path:path}"
)
def list_iso_items(
    folder_path: str = ""
):
    folder = get_iso_path(
        folder_path
    )

    if not folder.exists():
        folder.mkdir(
            parents=True,
            exist_ok=True
        )

    if not folder.is_dir():
        raise HTTPException(
            status_code=400,
            detail="Path is not a folder"
        )

    items = []

    try:
        entries = sorted(
            folder.iterdir(),
            key=lambda p: (
                not p.is_dir(),
                p.name.lower()
            )
        )

        for entry in entries:

            relative = (
                entry.relative_to(
                    ISO_BASE
                )
                .as_posix()
            )

            if entry.is_dir():

                try:
                    child_count = len(
                        list(entry.iterdir())
                    )
                except Exception:
                    child_count = 0

                items.append({
                    "name": entry.name,
                    "type": "folder",
                    "path": relative,
                    "item_count": child_count,
                })

            elif entry.is_file():

                size = entry.stat().st_size

                if size < 1024:
                    size_text = (
                        f"{size} B"
                    )
                elif size < 1024 * 1024:
                    size_text = (
                        f"{size / 1024:.1f} KB"
                    )
                else:
                    size_text = (
                        f"{size / (1024 * 1024):.1f} MB"
                    )

                items.append({
                    "name": entry.name,
                    "type": "file",
                    "path": relative,
                    "size": size,
                    "size_text": size_text,
                })

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to read ISO folder: {e}"
            )
        )

    return {
        "path": folder_path or "",
        "items": items,
    }


# ============================================================
# ISO: CREATE FOLDER
# ============================================================

@app.post("/iso/folders")
def create_iso_folder(
    payload: dict
):
    parent_path = (
        payload.get("path") or ""
    )

    name = (
        payload.get("name") or ""
    ).strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Folder name is required"
        )

    if (
        name in [".", ".."]
        or "/" in name
        or "\\" in name
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid folder name"
        )

    parent = get_iso_path(
        parent_path
    )

    if not parent.exists():
        parent.mkdir(
            parents=True,
            exist_ok=True
        )

    if not parent.is_dir():
        raise HTTPException(
            status_code=400,
            detail="Parent path is not a folder"
        )

    new_folder = (
        parent / name
    ).resolve()

    try:
        new_folder.relative_to(
            ISO_BASE.resolve()
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid folder path"
        )

    if new_folder.exists():
        raise HTTPException(
            status_code=400,
            detail=(
                "A folder with this name already exists"
            )
        )

    try:
        new_folder.mkdir(
            parents=False,
            exist_ok=False
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to create folder: {e}"
            )
        )

    return {
        "message": "Folder created successfully",
        "name": name,
        "path": new_folder.relative_to(
            ISO_BASE
        ).as_posix(),
    }


# ============================================================
# ISO: UPLOAD FILE
# ============================================================

@app.post("/iso/files")
async def upload_iso_file(
    file: UploadFile = File(...),
    path: str = Form("")
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    folder = get_iso_path(path)

    folder.mkdir(
        parents=True,
        exist_ok=True
    )

    filename = Path(
        file.filename
    ).name

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename"
        )

    destination = (
        folder / filename
    ).resolve()

    try:
        destination.relative_to(
            ISO_BASE.resolve()
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file path"
        )

    if destination.exists():
        raise HTTPException(
            status_code=400,
            detail=(
                "A file with this name already exists"
            )
        )

    try:
        with open(
            destination,
            "wb"
        ) as output:

            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                output.write(chunk)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to save file: {e}"
            )
        )

    return {
        "message": "File uploaded successfully",
        "name": filename,
        "path": destination.relative_to(
            ISO_BASE
        ).as_posix(),
    }


# ============================================================
# ISO: DOWNLOAD FILE
# ============================================================

@app.get(
    "/iso/download/{file_path:path}"
)
def download_iso_file(
    file_path: str
):
    target = get_iso_path(
        file_path
    )

    if not target.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if not target.is_file():
        raise HTTPException(
            status_code=400,
            detail="Path is not a file"
        )

    return FileResponse(
        path=str(target),
        filename=target.name,
        media_type="application/octet-stream",
    )


@app.get("/iso/view/{file_path:path}")
def view_iso_file(file_path: str):
    """Serve ISO file for inline view. Converts Office docs to PDF using soffice if available."""
    target = get_iso_path(file_path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    suffix = target.suffix.lower()

    # Inline view for PDF and images
    if suffix in [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]:
        mime_type, _ = mimetypes.guess_type(str(target))
        headers = {"Content-Disposition": f'inline; filename="{target.name}"'}
        return FileResponse(path=str(target), media_type=mime_type or "application/octet-stream", headers=headers)

    # Office conversion
    office_exts = {".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}

    if suffix in office_exts:
        # try to serve cached PDF if exists
        pdf_path = target.with_suffix('.pdf')
        if pdf_path.exists():
            headers = {"Content-Disposition": f'inline; filename="{pdf_path.name}"'}
            return FileResponse(path=str(pdf_path), media_type="application/pdf", headers=headers)

        # attempt conversion with soffice
        try:
            outdir = str(target.parent)
            cmd = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", outdir, str(target)]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if pdf_path.exists():
                headers = {"Content-Disposition": f'inline; filename="{pdf_path.name}"'}
                return FileResponse(path=str(pdf_path), media_type="application/pdf", headers=headers)
        except Exception as e:
            print("ISO document conversion failed:", e)

        # fallback: attempt to serve original file inline if possible
        mime_type, _ = mimetypes.guess_type(str(target))
        headers = {"Content-Disposition": f'inline; filename="{target.name}"'}
        return FileResponse(path=str(target), media_type=mime_type or "application/octet-stream", headers=headers)

    # default: serve inline if possible, else download
    mime_type, _ = mimetypes.guess_type(str(target))
    headers = {"Content-Disposition": f'inline; filename="{target.name}"'}
    return FileResponse(path=str(target), media_type=mime_type or "application/octet-stream", headers=headers)


# ============================================================
# ISO: DELETE FILE OR FOLDER
# ============================================================

@app.delete("/iso/items")
def delete_iso_item(
    payload: dict
):
    relative_path = (
        payload.get("path") or ""
    )

    if not relative_path:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete ISO root folder"
        )

    target = get_iso_path(
        relative_path
    )

    if not target.exists():
        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    try:

        if target.is_dir():
            shutil.rmtree(
                target
            )
        else:
            target.unlink()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to delete item: {e}"
            )
        )

    return {
        "message": "Item deleted successfully",
        "path": relative_path,
    }


# ============================================================
# LOAD PAYROLL INDEX
# ============================================================

def load_payroll_index():

    if not PAYROLL_INDEX_FILE.exists():
        return []

    try:

        with open(
            PAYROLL_INDEX_FILE,
            "r",
            encoding="utf-8",
        ) as file:

            data = json.load(file)

        if isinstance(data, list):
            return data

        return []

    except Exception as error:

        print(
            "Payroll index read error:",
            error,
        )

        return []


# ============================================================
# SAVE PAYROLL INDEX
# ============================================================

def save_payroll_index(items):

    temporary_file = (
        PAYROLL_INDEX_FILE.with_suffix(".tmp")
    )

    with open(
        temporary_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            items,
            file,
            indent=2,
            ensure_ascii=False,
        )

    os.replace(
        temporary_file,
        PAYROLL_INDEX_FILE,
    )


# ============================================================
# FIND PAYROLL FILE
# ============================================================

def find_payroll_file(file_id):

    file_id = str(file_id)

    payroll_files = (
        load_payroll_index()
    )

    for item in payroll_files:

        if str(
            item.get("id")
        ) == file_id:

            return item

    return None


# ============================================================
# GET PAYROLL FILE PATH
# ============================================================

def get_payroll_file_path(record):

    stored_filename = record.get(
        "stored_filename"
    )

    if not stored_filename:

        raise HTTPException(
            status_code=404,
            detail="Payroll file path not found",
        )

    safe_filename = Path(
        stored_filename
    ).name

    file_path = (
        PAYROLL_FOLDER /
        safe_filename
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Payroll file no longer exists",
        )

    return file_path


# ============================================================
# PAYROLL FILE RESPONSE
# ============================================================

def payroll_file_response(record):

    file_id = str(
        record["id"]
    )

    return {

        "id":
            file_id,

        "filename":
            record.get(
                "filename",
                "Payroll Workbook",
            ),

        "original_filename":
            record.get(
                "filename",
                "Payroll Workbook",
            ),

        "imported_at":
            record.get(
                "imported_at"
            ),

        "uploaded_at":
            record.get(
                "imported_at"
            ),

        "size":
            record.get(
                "size",
                0,
            ),

        "status":
            "Available",

        "open_url":
            f"/payroll/files/"
            f"{file_id}/view",

        "view_url":
            f"/payroll/files/"
            f"{file_id}/view",

        "download_url":
            f"/payroll/files/"
            f"{file_id}/download",

        # ----------------------------------------------------
        # DELETE URL
        # ----------------------------------------------------

        "delete_url":
            f"/payroll/files/"
            f"{file_id}",
    }


# ============================================================
# SAVE ORIGINAL PAYROLL EXCEL
# ============================================================

async def save_payroll_file(
    file: UploadFile,
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No Excel file selected",
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in [
        ".xlsx",
        ".xls",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload an Excel file "
                "(.xlsx or .xls)"
            ),
        )

    contents = await file.read()

    if not contents:

        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded Excel file is empty"
            ),
        )

    file_id = uuid.uuid4().hex

    stored_filename = (
        f"{file_id}{extension}"
    )

    stored_path = (
        PAYROLL_FOLDER /
        stored_filename
    )

    try:

        with open(
            stored_path,
            "wb",
        ) as output_file:

            output_file.write(
                contents
            )

        imported_at = (
            datetime.now().isoformat(
                timespec="seconds"
            )
        )

        record = {

            "id":
                file_id,

            "filename":
                Path(
                    file.filename
                ).name,

            "stored_filename":
                stored_filename,

            "imported_at":
                imported_at,

            "size":
                len(contents),
        }

        payroll_files = (
            load_payroll_index()
        )

        payroll_files.insert(
            0,
            record,
        )

        save_payroll_index(
            payroll_files
        )

        return record

    except Exception as error:

        print(
            "Payroll file save error:",
            error,
        )

        if stored_path.exists():

            stored_path.unlink(
                missing_ok=True
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save payroll Excel file"
            ),
        )


# ============================================================
# UPLOAD PAYROLL EXCEL
# ============================================================

@app.post(
    "/payroll/files"
)
async def upload_payroll_file(
    file: UploadFile = File(...),
):

    record = await save_payroll_file(
        file
    )

    return {

        "message":
            "Payroll Excel file uploaded successfully",

        **payroll_file_response(
            record
        ),
    }


# ============================================================
# GET PAYROLL FILE LIST
# ============================================================

@app.get(
    "/payroll/files"
)
def get_payroll_files():

    payroll_files = (
        load_payroll_index()
    )

    response = []

    valid_files = []

    for record in payroll_files:

        stored_filename = (
            record.get(
                "stored_filename"
            )
        )

        if not stored_filename:
            continue

        safe_filename = Path(
            stored_filename
        ).name

        file_path = (
            PAYROLL_FOLDER /
            safe_filename
        )

        if not file_path.exists():
            continue

        try:

            record["size"] = (
                file_path.stat().st_size
            )

        except Exception:
            pass

        valid_files.append(
            record
        )

        response.append(
            payroll_file_response(
                record
            )
        )

    if (
        len(valid_files)
        != len(payroll_files)
    ):

        save_payroll_index(
            valid_files
        )

    return response


# ============================================================
# OPEN PAYROLL FILE
# ============================================================

@app.get(
    "/payroll/files/{file_id}"
)
def open_payroll_file(
    file_id: str,
):

    record = find_payroll_file(
        file_id
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail="Payroll file not found",
        )

    return RedirectResponse(
        url=(
            f"/payroll/files/"
            f"{file_id}/view"
        ),
        status_code=307,
    )



# ============================================================
# DELETE PAYROLL FILE
# ============================================================

@app.delete(
    "/payroll/files/{file_id}"
)
def delete_payroll_file(
    file_id: str,
):

    # --------------------------------------------------------
    # FIND RECORD
    # --------------------------------------------------------

    record = find_payroll_file(
        file_id
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail="Payroll file not found",
        )

    # --------------------------------------------------------
    # GET STORED FILE PATH
    # --------------------------------------------------------

    stored_filename = record.get(
        "stored_filename"
    )

    if not stored_filename:

        raise HTTPException(
            status_code=404,
            detail="Stored payroll file not found",
        )

    safe_filename = Path(
        stored_filename
    ).name

    file_path = (
        PAYROLL_FOLDER /
        safe_filename
    )

    # --------------------------------------------------------
    # DELETE PHYSICAL EXCEL FILE
    # --------------------------------------------------------

    try:

        if file_path.exists():

            file_path.unlink()

    except Exception as error:

        print(
            "Payroll file deletion error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete payroll Excel file",
        )

    # --------------------------------------------------------
    # REMOVE FROM INDEX.JSON
    # --------------------------------------------------------

    payroll_files = (
        load_payroll_index()
    )

    updated_files = [

        item

        for item in payroll_files

        if str(
            item.get("id")
        ) != str(file_id)

    ]

    save_payroll_index(
        updated_files
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "message":
            "Payroll Excel file deleted successfully",

        "id":
            str(file_id),

        "filename":
            record.get(
                "filename",
                "Payroll Workbook",
            ),

    }

# ============================================================
# DOWNLOAD ORIGINAL PAYROLL FILE
# ============================================================

@app.get(
    "/payroll/files/{file_id}/download"
)
def download_payroll_file(
    file_id: str,
):

    record = find_payroll_file(
        file_id
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail="Payroll file not found",
        )

    file_path = (
        get_payroll_file_path(
            record
        )
    )

    original_filename = (
        record.get(
            "filename",
            "Payroll.xlsx",
        )
    )

    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
            if file_path.suffix.lower()
            == ".xlsx"
            else "application/vnd.ms-excel"
        ),
    )


# ============================================================
# EXCEL -> HTML PREVIEW
# ============================================================

def excel_to_html(
    file_path: str,
    filename: str,
    file_id: str,
):
    file_path = Path(file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Excel file does not exist",
        )

    # --------------------------------------------------------
    # XLS PREVIEW NOT SUPPORTED
    # --------------------------------------------------------

    if file_path.suffix.lower() != ".xlsx":
        raise HTTPException(
            status_code=400,
            detail=(
                "Browser preview is supported only for .xlsx files. "
                "Use Download for .xls files."
            ),
        )

    # --------------------------------------------------------
    # OPEN WORKBOOK
    #
    # data_only=True means:
    #   Excel formula -> calculated result
    #
    # Example:
    #   =COUNTIF(G4:AK4,"P")
    #
    # will display:
    #   22
    #
    # instead of displaying the formula itself.
    # --------------------------------------------------------

    try:
        workbook = load_workbook(
            filename=str(file_path),
            data_only=True,
            read_only=False,
        )

    except Exception as error:
        print(
            "Excel preview error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to read Excel workbook: {error}"
            ),
        )

    try:

        parts = []

        safe_filename = html.escape(
            str(filename)
        )

        # ====================================================
        # HELPER: COLOR
        # ====================================================

        def get_color(color):
            if not color:
                return None

            try:

                color_type = getattr(
                    color,
                    "type",
                    None,
                )

                if color_type == "rgb":
                    rgb = color.rgb

                    if rgb:
                        rgb = str(rgb)

                        if len(rgb) == 8:
                            rgb = rgb[-6:]

                        if len(rgb) == 6:
                            return f"#{rgb}"

                elif color_type == "indexed":
                    indexed = getattr(
                        color,
                        "indexed",
                        None,
                    )

                    indexed_colors = {
                        0: "#000000",
                        1: "#FFFFFF",
                        2: "#FF0000",
                        3: "#00FF00",
                        4: "#0000FF",
                        5: "#FFFF00",
                        6: "#FF00FF",
                        7: "#00FFFF",
                    }

                    return indexed_colors.get(
                        indexed
                    )

                elif color_type == "theme":
                    # Theme colors can be complicated.
                    # We intentionally avoid inventing
                    # a color when Excel uses a theme.
                    return None

            except Exception:
                pass

            return None

        # ====================================================
        # HELPER: BORDER STYLE
        # ====================================================

        def border_css(side):
            if not side:
                return "none"

            style = getattr(
                side,
                "style",
                None,
            )

            if not style:
                return "none"

            color = get_color(
                getattr(
                    side,
                    "color",
                    None,
                )
            )

            if not color:
                color = "#9ca3af"

            width_map = {
                "thin": "1px",
                "medium": "2px",
                "thick": "3px",
                "double": "3px",
                "hair": "1px",
                "dotted": "1px",
                "dashed": "1px",
            }

            width = width_map.get(
                style,
                "1px",
            )

            css_style = style

            if style == "double":
                css_style = "double"
            elif style in [
                "thin",
                "medium",
                "thick",
            ]:
                css_style = "solid"

            return (
                f"{width} "
                f"{css_style} "
                f"{color}"
            )

        # ====================================================
        # HELPER: EXCEL ALIGNMENT
        # ====================================================

        def get_alignment_css(cell):

            alignment = cell.alignment

            css = []

            horizontal = (
                alignment.horizontal
            )

            vertical = (
                alignment.vertical
            )

            wrap_text = (
                alignment.wrap_text
            )

            text_rotation = (
                alignment.text_rotation
            )

            shrink_to_fit = (
                alignment.shrink_to_fit
            )

            if horizontal:
                horizontal_map = {
                    "left": "left",
                    "center": "center",
                    "right": "right",
                    "fill": "left",
                    "justify": "justify",
                    "centerContinuous": "center",
                    "distributed": "justify",
                }

                css.append(
                    "text-align:"
                    + horizontal_map.get(
                        horizontal,
                        "left",
                    )
                    + ";"
                )

            if vertical:
                vertical_map = {
                    "top": "top",
                    "center": "middle",
                    "bottom": "bottom",
                }

                css.append(
                    "vertical-align:"
                    + vertical_map.get(
                        vertical,
                        "middle",
                    )
                    + ";"
                )

            if wrap_text:
                css.append(
                    "white-space:pre-wrap;"
                )
                css.append(
                    "word-break:break-word;"
                )
            else:
                css.append(
                    "white-space:nowrap;"
                )

            if text_rotation:
                if text_rotation == 255:
                    css.append(
                        "writing-mode:vertical-rl;"
                    )
                elif (
                    isinstance(
                        text_rotation,
                        int,
                    )
                    and text_rotation != 0
                ):
                    css.append(
                        "transform:"
                        f"rotate({-text_rotation}deg);"
                    )

            if shrink_to_fit:
                css.append(
                    "font-size:0.9em;"
                )

            return "".join(css)

        # ====================================================
        # HELPER: CELL STYLE
        # ====================================================

        def get_cell_style(cell):

            css = []

            # ------------------------------------------------
            # FONT
            # ------------------------------------------------

            font = cell.font

            if font:

                if font.name:
                    css.append(
                        "font-family:"
                        f"'{html.escape(str(font.name))}';"
                    )

                if font.sz:
                    css.append(
                        "font-size:"
                        f"{font.sz}pt;"
                    )

                if font.bold:
                    css.append(
                        "font-weight:700;"
                    )

                if font.italic:
                    css.append(
                        "font-style:italic;"
                    )

                if font.underline:
                    css.append(
                        "text-decoration:underline;"
                    )

                font_color = get_color(
                    getattr(
                        font,
                        "color",
                        None,
                    )
                )

                if font_color:
                    css.append(
                        f"color:{font_color};"
                    )

            # ------------------------------------------------
            # BACKGROUND
            # ------------------------------------------------

            fill = cell.fill

            if fill:

                fill_type = getattr(
                    fill,
                    "fill_type",
                    None,
                )

                if fill_type:

                    fill_color = get_color(
                        getattr(
                            fill,
                            "fgColor",
                            None,
                        )
                    )

                    if fill_color:
                        css.append(
                            f"background-color:"
                            f"{fill_color};"
                        )

            # ------------------------------------------------
            # ALIGNMENT
            # ------------------------------------------------

            css.append(
                get_alignment_css(
                    cell
                )
            )

            # ------------------------------------------------
            # BORDERS
            # ------------------------------------------------

            border = cell.border

            if border:

                css.append(
                    "border-top:"
                    + border_css(
                        border.top
                    )
                    + ";"
                )

                css.append(
                    "border-right:"
                    + border_css(
                        border.right
                    )
                    + ";"
                )

                css.append(
                    "border-bottom:"
                    + border_css(
                        border.bottom
                    )
                    + ";"
                )

                css.append(
                    "border-left:"
                    + border_css(
                        border.left
                    )
                    + ";"
                )

            # ------------------------------------------------
            # INDENT
            # ------------------------------------------------

            try:

                indent = (
                    cell.alignment.indent
                )

                if indent:
                    css.append(
                        "padding-left:"
                        f"{10 + indent * 15}px;"
                    )

            except Exception:
                pass

            return "".join(css)

        # ====================================================
        # HELPER: FORMAT CELL VALUE
        # ====================================================

        def format_cell_value(cell):

            value = cell.value

            if value is None:
                return ""

            # ------------------------------------------------
            # DATE / DATETIME
            # ------------------------------------------------

            if isinstance(
                value,
                datetime,
            ):

                try:

                    return value.strftime(
                        "%d-%m-%Y %H:%M:%S"
                    )

                except Exception:
                    return str(value)

            # ------------------------------------------------
            # TIME
            # ------------------------------------------------

            try:

                from datetime import time

                if isinstance(
                    value,
                    time,
                ):
                    return value.strftime(
                        "%H:%M:%S"
                    )

            except Exception:
                pass

            # ------------------------------------------------
            # BOOLEAN
            # ------------------------------------------------

            if isinstance(
                value,
                bool,
            ):

                return (
                    "TRUE"
                    if value
                    else "FALSE"
                )

            # ------------------------------------------------
            # NUMBERS
            # ------------------------------------------------

            if isinstance(
                value,
                float,
            ):

                if value.is_integer():
                    return str(
                        int(value)
                    )

            # ------------------------------------------------
            # NORMAL VALUE
            # ------------------------------------------------

            return str(value)

        # ====================================================
        # HELPER: COLUMN WIDTH
        # ====================================================

        def get_column_width(
            worksheet,
            column_letter,
        ):

            try:

                dimension = (
                    worksheet.column_dimensions[
                        column_letter
                    ]
                )

                width = dimension.width

                if width is None:
                    return 100

                # Excel width -> approximate pixels
                pixel_width = int(
                    width * 7 + 12
                )

                # Keep readable limits
                pixel_width = max(
                    45,
                    min(
                        pixel_width,
                        450,
                    ),
                )

                return pixel_width

            except Exception:
                return 100

        # ====================================================
        # HTML HEADER
        # ====================================================

        parts.append(
            f"""
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    {safe_filename}
</title>

<style>

* {{
    box-sizing: border-box;
}}

html,
body {{
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
}}

body {{

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:
        #eef2f7;

    color:
        #111827;
}}

/* =========================================================
   TOP BAR
   ========================================================= */

.topbar {{

    position: sticky;

    top: 0;

    z-index: 2000;

    width: 100%;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f8fafc
        );

    border-bottom:
        1px solid #dbe3ef;

    padding:
        14px 20px;

    box-shadow:
        0 3px 15px
        rgba(15,23,42,.10);
}}

.topbar-row {{

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 20px;

    max-width: 1800px;

    margin: auto;
}}

.title-section {{

    min-width: 0;
}}

.title {{

    font-size:
        20px;

    font-weight:
        800;

    color:
        #172033;

    margin-bottom:
        5px;
}}

.filename {{

    font-size:
        13px;

    color:
        #64748b;

    word-break:
        break-word;
}}

.download-button {{

    display:
        inline-flex;

    align-items:
        center;

    justify-content:
        center;

    flex-shrink:
        0;

    padding:
        10px 16px;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
        );

    color:
        white;

    text-decoration:
        none;

    border-radius:
        9px;

    font-size:
        13px;

    font-weight:
        700;

    box-shadow:
        0 5px 14px
        rgba(37,99,235,.25);

    transition:
        .2s ease;
}}

.download-button:hover {{

    transform:
        translateY(-1px);

    box-shadow:
        0 8px 18px
        rgba(37,99,235,.30);
}}

/* =========================================================
   SHEET TABS
   ========================================================= */

.sheet-tabs {{

    position:
        sticky;

    top:
        72px;

    z-index:
        1900;

    display:
        flex;

    gap:
        7px;

    overflow-x:
        auto;

    background:
        #e9eef7;

    border-bottom:
        1px solid #ccd6e5;

    padding:
        9px 14px;

    scrollbar-width:
        thin;
}}

.sheet-tab {{

    flex-shrink:
        0;

    padding:
        8px 15px;

    background:
        rgba(255,255,255,.85);

    border:
        1px solid #cbd5e1;

    border-radius:
        8px;

    color:
        #334155;

    cursor:
        pointer;

    font-size:
        13px;

    font-weight:
        700;

    transition:
        all .2s ease;
}}

.sheet-tab:hover {{

    background:
        white;

    border-color:
        #93c5fd;

    color:
        #1d4ed8;
}}

.sheet-tab.active {{

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
        );

    color:
        white;

    border-color:
        #2563eb;

    box-shadow:
        0 4px 12px
        rgba(37,99,235,.25);
}}

/* =========================================================
   WORKBOOK AREA
   ========================================================= */

.workbook {{

    width:
        100%;

    padding:
        18px;

    overflow-x:
        auto;
}}

.sheet {{

    display:
        none;

    width:
        max-content;

    min-width:
        100%;

    background:
        white;

    border:
        1px solid #cbd5e1;

    border-radius:
        10px;

    overflow:
        visible;

    box-shadow:
        0 5px 20px
        rgba(15,23,42,.10);
}}

.sheet.active {{
    display:
        block;
}}

.sheet-title {{

    position:
        sticky;

    left:
        0;

    padding:
        12px 16px;

    background:
        linear-gradient(
            135deg,
            #f8fafc,
            #eef2ff
        );

    border-bottom:
        1px solid #cbd5e1;

    font-size:
        15px;

    font-weight:
        800;

    color:
        #1e293b;
}}

/* =========================================================
   TABLE CONTAINER
   ========================================================= */

.table-container {{

    width:
        100%;

    max-height:
        calc(100vh - 170px);

    overflow:
        auto;

    scrollbar-width:
        thin;

    scrollbar-color:
        #94a3b8
        #e2e8f0;
}}

table {{

    border-collapse:
        collapse;

    table-layout:
        fixed;

    width:
        max-content;

    min-width:
        100%;

    background:
        white;
}}

td {{

    position:
        relative;

    padding:
        6px 8px;

    min-width:
        45px;

    max-width:
        450px;

    vertical-align:
        middle;

    font-size:
        13px;

    line-height:
        1.35;

    background:
        white;
}}

/* =========================================================
   EXCEL-LIKE ROW HOVER
   ========================================================= */

tbody tr:hover td {{

    filter:
        brightness(.985);
}}

/* =========================================================
   ROW NUMBER
   ========================================================= */

.row-number {{

    position:
        sticky;

    left:
        0;

    z-index:
        50;

    min-width:
        48px;

    width:
        48px;

    text-align:
        center;

    background:
        #f1f5f9 !important;

    color:
        #64748b;

    font-weight:
        700;

    border-right:
        1px solid #cbd5e1 !important;
}}

/* =========================================================
   EMPTY SHEET
   ========================================================= */

.empty-sheet {{

    padding:
        35px;

    color:
        #64748b;

    font-size:
        14px;

    text-align:
        center;
}}

/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {{

    .workbook {{
        padding:
            8px;
    }}

    .topbar {{
        padding:
            12px;
    }}

    .topbar-row {{

        align-items:
            flex-start;

        flex-direction:
            column;
    }}

    .download-button {{
        width:
            100%;
    }}

    .sheet-tabs {{
        top:
            118px;
    }}

    .table-container {{
        max-height:
            calc(100vh - 190px);
    }}

    td {{
        font-size:
            12px;
    }}
}}

</style>

</head>

<body>

<div class="topbar">

    <div class="topbar-row">

        <div class="title-section">

            <div class="title">
                Excel Workbook
            </div>

            <div class="filename">
                {safe_filename}
            </div>

        </div>

        <a
            class="download-button"
            href="/payroll/files/{file_id}/download"
        >
            ⬇&nbsp; Download Original Excel
        </a>

    </div>

</div>
"""
        )

        # ====================================================
        # SHEET TABS
        # ====================================================

        sheet_names = list(
            workbook.sheetnames
        )

        if sheet_names:

            parts.append(
                '<div class="sheet-tabs">'
            )

            for index, sheet_name in enumerate(
                sheet_names
            ):

                active_class = (
                    " active"
                    if index == 0
                    else ""
                )

                parts.append(
                    f"""
<button
    type="button"
    class="sheet-tab{active_class}"
    onclick="showSheet({index})"
>
    {html.escape(str(sheet_name))}
</button>
"""
                )

            parts.append(
                "</div>"
            )

        # ====================================================
        # WORKBOOK
        # ====================================================

        parts.append(
            '<div class="workbook">'
        )

        # ====================================================
        # EACH WORKSHEET
        # ====================================================

        for sheet_index, sheet in enumerate(
            workbook.worksheets
        ):

            active_class = (
                " active"
                if sheet_index == 0
                else ""
            )

            safe_title = html.escape(
                str(sheet.title)
            )

            parts.append(
                f"""
<div
    class="sheet{active_class}"
    id="sheet-{sheet_index}"
>

<div class="sheet-title">
    {safe_title}
</div>

<div class="table-container">

<table>

<tbody>
"""
            )

            # ------------------------------------------------
            # DETERMINE USED RANGE
            # ------------------------------------------------

            min_row = 1
            min_col = 1

            max_row = (
                sheet.max_row
            )

            max_col = (
                sheet.max_column
            )

            # ------------------------------------------------
            # MERGED CELLS
            # ------------------------------------------------

            merged_ranges = list(
                sheet.merged_cells.ranges
            )

            merged_lookup = {}

            for merged_range in merged_ranges:

                min_r = (
                    merged_range.min_row
                )

                max_r = (
                    merged_range.max_row
                )

                min_c = (
                    merged_range.min_col
                )

                max_c = (
                    merged_range.max_col
                )

                for row in range(
                    min_r,
                    max_r + 1,
                ):

                    for col in range(
                        min_c,
                        max_c + 1,
                    ):

                        merged_lookup[
                            (row, col)
                        ] = {
                            "min_row": min_r,
                            "max_row": max_r,
                            "min_col": min_c,
                            "max_col": max_c,
                        }

            # ------------------------------------------------
            # RENDER ROWS
            # ------------------------------------------------

            for row_number in range(
                min_row,
                max_row + 1,
            ):

                parts.append(
                    "<tr>"
                )

                # --------------------------------------------
                # ROW NUMBER
                # --------------------------------------------

                parts.append(
                    f"""
<td
    class="row-number"
>
    {row_number}
</td>
"""
                )

                for column_number in range(
                    min_col,
                    max_col + 1,
                ):

                    # ----------------------------------------
                    # MERGED CELL CHECK
                    # ----------------------------------------

                    merge_info = (
                        merged_lookup.get(
                            (
                                row_number,
                                column_number,
                            )
                        )
                    )

                    if merge_info:

                        is_top_left = (
                            row_number
                            == merge_info[
                                "min_row"
                            ]
                            and
                            column_number
                            == merge_info[
                                "min_col"
                            ]
                        )

                        if not is_top_left:
                            continue

                    # ----------------------------------------
                    # CELL
                    # ----------------------------------------

                    cell = sheet.cell(
                        row=row_number,
                        column=column_number,
                    )

                    # ----------------------------------------
                    # VALUE
                    # ----------------------------------------

                    display_value = (
                        format_cell_value(
                            cell
                        )
                    )

                    display_value = (
                        html.escape(
                            display_value
                        )
                    )

                    # ----------------------------------------
                    # STYLE
                    # ----------------------------------------

                    cell_style = (
                        get_cell_style(
                            cell
                        )
                    )

                    # ----------------------------------------
                    # COLUMN WIDTH
                    # ----------------------------------------

                    column_letter = (
                        get_column_letter(
                            column_number
                        )
                    )

                    column_width = (
                        get_column_width(
                            sheet,
                            column_letter,
                        )
                    )

                    cell_style += (
                        f"width:"
                        f"{column_width}px;"
                    )

                    # ----------------------------------------
                    # ROW HEIGHT
                    # ----------------------------------------

                    try:

                        row_dimension = (
                            sheet.row_dimensions[
                                row_number
                            ]
                        )

                        row_height = (
                            row_dimension.height
                        )

                        if row_height:

                            pixel_height = (
                                int(
                                    row_height
                                    * 1.333
                                )
                            )

                            cell_style += (
                                f"height:"
                                f"{pixel_height}px;"
                            )

                    except Exception:
                        pass

                    # ----------------------------------------
                    # MERGE ATTRIBUTES
                    # ----------------------------------------

                    rowspan = 1
                    colspan = 1

                    if merge_info:

                        rowspan = (
                            merge_info[
                                "max_row"
                            ]
                            -
                            merge_info[
                                "min_row"
                            ]
                            + 1
                        )

                        colspan = (
                            merge_info[
                                "max_col"
                            ]
                            -
                            merge_info[
                                "min_col"
                            ]
                            + 1
                        )

                    # ----------------------------------------
                    # DATA TYPE
                    # ----------------------------------------

                    data_type = (
                        html.escape(
                            str(
                                cell.data_type
                            )
                        )
                    )

                    # ----------------------------------------
                    # CELL HTML
                    # ----------------------------------------

                    parts.append(
                        f"""
<td
    data-row="{row_number}"
    data-column="{column_number}"
    data-type="{data_type}"
    style="{cell_style}"
"""
                    )

                    if rowspan > 1:

                        parts.append(
                            f'    rowspan="{rowspan}"\n'
                        )

                    if colspan > 1:

                        parts.append(
                            f'    colspan="{colspan}"\n'
                        )

                    parts.append(
                        f"""
>
    {display_value}
</td>
"""
                    )

                parts.append(
                    "</tr>"
                )

            parts.append(
                """
</tbody>

</table>

"""
            )

            # ------------------------------------------------
            # EMPTY SHEET
            # ------------------------------------------------

            if (
                max_row == 0
                or max_col == 0
            ):

                parts.append(
                    """
<div class="empty-sheet">
    This worksheet is empty.
</div>
"""
                )

            parts.append(
                """
</div>

</div>
"""
            )

        # ====================================================
        # JAVASCRIPT
        # ====================================================

        parts.append(
            """
</div>

<script>

function showSheet(index) {

    const sheets =
        document.querySelectorAll(
            ".sheet"
        );

    const tabs =
        document.querySelectorAll(
            ".sheet-tab"
        );

    sheets.forEach(
        function(sheet, i) {

            sheet.classList.toggle(
                "active",
                i === index
            );

        }
    );

    tabs.forEach(
        function(tab, i) {

            tab.classList.toggle(
                "active",
                i === index
            );

        }
    );

}

</script>

</body>

</html>
"""
        )

        return "".join(parts)

    finally:

        workbook.close()


# ============================================================
# VIEW PAYROLL FILE
# ============================================================

@app.get(
    "/payroll/files/{file_id}/view",
    response_class=HTMLResponse,
)
def view_payroll_file(
    file_id: str,
):

    record = find_payroll_file(
        file_id
    )

    if not record:

        raise HTTPException(
            status_code=404,
            detail="Payroll file not found",
        )

    file_path = (
        get_payroll_file_path(
            record
        )
    )

    filename = record.get(
        "filename",
        file_path.name,
    )

    # --------------------------------------------------------
    # XLS FILE
    # --------------------------------------------------------

    if (
        file_path.suffix.lower()
        == ".xls"
    ):

        safe_filename = html.escape(
            str(filename)
        )

        return HTMLResponse(
            content=f"""
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    {safe_filename}
</title>

<style>

body {{
    margin: 0;
    padding: 40px;
    font-family: Arial, sans-serif;
    background: #f3f4f6;
    color: #111827;
}}

.card {{
    max-width: 650px;
    margin: 80px auto;
    background: white;
    padding: 35px;
    border-radius: 12px;
    box-shadow:
        0 4px 20px rgba(0,0,0,.08);
}}

h1 {{
    margin-top: 0;
}}

p {{
    color: #6b7280;
    line-height: 1.6;
}}

.button {{
    display: inline-block;
    margin-top: 15px;
    padding: 11px 17px;
    background: #2563eb;
    color: white;
    text-decoration: none;
    border-radius: 7px;
    font-weight: 700;
}}

</style>

</head>

<body>

<div class="card">

<h1>
    Excel Workbook
</h1>

<p>
    <strong>{safe_filename}</strong>
    is an old Excel .xls workbook.
</p>

<p>
    Browser preview is available for .xlsx files.
    Please download this workbook to open it in Excel.
</p>

<a
    class="button"
    href="/payroll/files/{file_id}/download"
>
    ⬇ Download Excel File
</a>

</div>

</body>

</html>
""",
            status_code=200,
        )

    # --------------------------------------------------------
    # XLSX PREVIEW
    # --------------------------------------------------------

    content = excel_to_html(
        file_path=str(file_path),
        filename=filename,
        file_id=file_id,
    )

    return HTMLResponse(
        content=content
    )


# ============================================================
# GENERATE EMPLOYEE ID
# ============================================================

def generate_employee_id(db):

    existing_ids = set(

        employee.employee_id

        for employee in (
            db.query(
                Employee
            ).all()
        )

        if employee.employee_id
    )

    number = 1

    while True:

        candidate = (
            f"EMP-{number}"
        )

        if candidate not in existing_ids:

            return candidate

        number += 1


# ============================================================
# EMPLOYEE RESPONSE
# ============================================================

def employee_response(
    employee,
):

    return {

        "id":
            employee.id,

        "employee_id":
            employee.employee_id,

        "serial_no":
            employee.serial_no,

        "name":
            employee.name,

        "team":
            normalize_team(
                employee.team
            ),

        "designation":
            employee.designation,

        "project_name":
            employee.project_name,

        "doj":
            employee.doj,

        "dob":
            employee.dob,

        "grade":
            employee.grade,

        "performance":
            employee.performance,

        "qualification":
            employee.qualification,

        "gender":
            employee.gender,

        "contact_number":
            employee.contact_number,

        "personal_email":
            employee.personal_email,

        "name_as_per_aadhar":
            employee.name_as_per_aadhar,

        "aadhar_number":
            employee.aadhar_number,

        "father_name":
            employee.father_name,

        "pan_no":
            employee.pan_no,

        "salary":
            employee.salary,

        "stipend":
            employee.stipend,

        "pf":
            employee.pf,

        "ctc":
            employee.ctc,

        "pf_no":
            employee.pf_no,

        "uan_no":
            employee.uan_no,

        "bank_account_no":
            employee.bank_account_no,

        "ifsc_code":
            employee.ifsc_code,

        "branch":
            employee.branch,

        "remarks":
            employee.remarks,

        "status":
            employee.status,

        "import_id":
            employee.import_id,

        "payroll_type":
            employee.payroll_type,
    }


# ============================================================
# HOME
# ============================================================

@app.get("/")
def root():

    return {

        "message":
            "HR Dashboard API is running",

        "status":
            "ok",
    }


# ============================================================
# IMPORT EMPLOYEE EXCEL
# ============================================================

@app.post(
    "/employees/import"
)
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected",
        )

    if not file.filename.lower().endswith(
        (
            ".xlsx",
            ".xls",
        )
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload an Excel file",
        )

    contents = await file.read()

    if not contents:

        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty",
        )

    temp_path = None
    import_history = None
    archived_file = None
    stored_path = None

    try:

        # ----------------------------------------------------
        # SAVE ORIGINAL WORKBOOK FIRST
        # ----------------------------------------------------

        file_id = uuid.uuid4().hex

        extension = (
            Path(
                file.filename
            ).suffix.lower()
        )

        stored_filename = (
            f"{file_id}{extension}"
        )

        stored_path = (
            PAYROLL_FOLDER /
            stored_filename
        )

        with open(
            stored_path,
            "wb",
        ) as output_file:

            output_file.write(
                contents
            )

        archived_file = {

            "id":
                file_id,

            "filename":
                Path(
                    file.filename
                ).name,

            "stored_filename":
                stored_filename,

            "imported_at":
                datetime.now().isoformat(
                    timespec="seconds"
                ),

            "size":
                len(contents),
        }

        payroll_files = (
            load_payroll_index()
        )

        payroll_files.insert(
            0,
            archived_file,
        )

        save_payroll_index(
            payroll_files
        )

        # ----------------------------------------------------
        # CREATE IMPORT HISTORY
        # ----------------------------------------------------

        import_history = ImportHistory(

            filename=(
                Path(
                    file.filename
                ).name
            ),

            imported_at=datetime.now(),

            records=0,

            status="Processing",

            file_id=file_id,

            stored_filename=stored_filename,

            file_size=len(contents),
        )

        db.add(
            import_history
        )

        db.commit()

        db.refresh(
            import_history
        )

        # ----------------------------------------------------
        # TEMPORARY FILE FOR IMPORT
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp_file:

            temp_file.write(
                contents
            )

            temp_path = (
                temp_file.name
            )

        # ----------------------------------------------------
        # IMPORT EMPLOYEES
        # ----------------------------------------------------

        result = import_excel(

            temp_path,

            db,

            import_id=(
                import_history.id
            ),
        )

        # ----------------------------------------------------
        # UPDATE IMPORT HISTORY
        # ----------------------------------------------------

        import_history.records = (
            result.get(
                "imported",
                0,
            )
        )

        import_history.status = (
            "Completed"
        )

        db.commit()

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        return {

            "message":
                "Excel imported successfully",

            "import_id":
                import_history.id,

            "filename":
                import_history.filename,

            "file_id":
                file_id,

            "open_url":
                f"/payroll/files/"
                f"{file_id}/view",

            "view_url":
                f"/payroll/files/"
                f"{file_id}/view",

            "download_url":
                f"/payroll/files/"
                f"{file_id}/download",

            "delete_url":
                f"/payroll/files/"
                f"{file_id}",

            **result,
        }

    except ValueError as error:

        db.rollback()

        # ----------------------------------------------------
        # REMOVE ARCHIVED FILE
        # ----------------------------------------------------

        if archived_file:

            payroll_files = (
                load_payroll_index()
            )

            payroll_files = [

                item

                for item in payroll_files

                if item.get("id")
                !=
                archived_file.get("id")
            ]

            save_payroll_index(
                payroll_files
            )

            stored_path = (
                PAYROLL_FOLDER /
                archived_file[
                    "stored_filename"
                ]
            )

            if stored_path.exists():

                stored_path.unlink(
                    missing_ok=True
                )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Excel import error:",
            error,
        )

        db.rollback()

        # ----------------------------------------------------
        # MARK IMPORT FAILED
        # ----------------------------------------------------

        if import_history:

            try:

                failed_history = (

                    db.query(
                        ImportHistory
                    )

                    .filter(
                        ImportHistory.id
                        ==
                        import_history.id
                    )

                    .first()
                )

                if failed_history:

                    failed_history.status = (
                        "Failed"
                    )

                    db.commit()

            except Exception:

                db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to import Excel file"
            ),
        )

    finally:

        if (
            temp_path
            and
            os.path.exists(
                temp_path
            )
        ):

            os.remove(
                temp_path
            )


# ============================================================
# IMPORT HISTORY
# ============================================================

@app.get(
    "/imports"
)
def get_import_history(
    db: Session = Depends(get_db),
):

    imports = (

        db.query(
            ImportHistory
        )

        .order_by(
            ImportHistory.id.desc()
        )

        .all()
    )

    response = []

    for import_record in imports:

        employee_count = (

            db.query(
                Employee
            )

            .filter(
                Employee.import_id
                ==
                import_record.id
            )

            .count()
        )

        open_url = None
        download_url = None
        delete_url = None

        if import_record.file_id:

            open_url = (
                f"/payroll/files/"
                f"{import_record.file_id}"
                f"/view"
            )

            download_url = (
                f"/payroll/files/"
                f"{import_record.file_id}"
                f"/download"
            )

            delete_url = (
                f"/payroll/files/"
                f"{import_record.file_id}"
            )

        imported_at = (
            import_record.imported_at
        )

        if isinstance(
            imported_at,
            datetime,
        ):

            imported_at = (
                imported_at.isoformat()
            )

        file_available = False

        if (
            import_record.file_id
            and
            import_record.stored_filename
        ):

            file_path = (
                PAYROLL_FOLDER /
                Path(
                    import_record.stored_filename
                ).name
            )

            file_available = (
                file_path.exists()
            )

        response.append({

            "id":
                import_record.id,

            "filename":
                import_record.filename,

            "imported_at":
                imported_at,

            "records":
                employee_count,

            "status":
                import_record.status,

            "file_id":
                import_record.file_id,

            "stored_filename":
                import_record.stored_filename,

            "file_size":
                import_record.file_size,

            "open_url":
                open_url,

            "view_url":
                open_url,

            "download_url":
                download_url,

            "delete_url":
                delete_url,

            "file_available":
                file_available,
        })

    return response


# ============================================================
# DELETE IMPORT HELPER
# ============================================================

def delete_import_data(
    import_record,
    db: Session,
):
    """
    Delete everything belonging to an imported Excel file:

    1. Employees created by this import
    2. ImportHistory record
    3. Original Excel file
    4. Payroll index entry
    """

    if not import_record:

        raise HTTPException(
            status_code=404,
            detail="Import history not found",
        )

    employees = (

        db.query(
            Employee
        )

        .filter(
            Employee.import_id
            ==
            import_record.id
        )

        .all()
    )

    deleted_count = len(
        employees
    )

    file_id = (
        import_record.file_id
    )

    stored_filename = (
        import_record.stored_filename
    )

    try:

        # ----------------------------------------------------
        # DELETE EMPLOYEES
        # ----------------------------------------------------

        for employee in employees:

            db.delete(
                employee
            )

        # ----------------------------------------------------
        # DELETE IMPORT HISTORY
        # ----------------------------------------------------

        db.delete(
            import_record
        )

        db.commit()

        # ----------------------------------------------------
        # DELETE ORIGINAL EXCEL
        # ----------------------------------------------------

        if stored_filename:

            safe_filename = Path(
                stored_filename
            ).name

            file_path = (
                PAYROLL_FOLDER /
                safe_filename
            )

            if file_path.exists():

                file_path.unlink(
                    missing_ok=True
                )

        # ----------------------------------------------------
        # REMOVE FROM PAYROLL INDEX
        # ----------------------------------------------------

        if file_id:

            payroll_files = (
                load_payroll_index()
            )

            payroll_files = [

                item

                for item in payroll_files

                if str(
                    item.get("id")
                )
                !=
                str(file_id)
            ]

            save_payroll_index(
                payroll_files
            )

        return {

            "message":
                "Import deleted successfully",

            "import_id":
                import_record.id,

            "file_id":
                file_id,

            "deleted_employees":
                deleted_count,
        }

    except Exception as error:

        db.rollback()

        print(
            "Delete import error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete import",
        )


# ============================================================
# DELETE EMPLOYEE IMPORT BY IMPORT ID
# ============================================================

@app.delete(
    "/imports/{import_id}"
)
def delete_import(
    import_id: int,
    db: Session = Depends(get_db),
):

    import_record = (

        db.query(
            ImportHistory
        )

        .filter(
            ImportHistory.id
            ==
            import_id
        )

        .first()
    )

    if not import_record:

        raise HTTPException(
            status_code=404,
            detail="Import history not found",
        )

    return delete_import_data(
        import_record,
        db,
    )


# ============================================================
# DELETE PAYROLL FILE BY FILE ID
# ============================================================

@app.delete(
    "/payroll/files/{file_id}"
)
def delete_payroll_file(
    file_id: str,
    db: Session = Depends(get_db),
):

    file_id = str(
        file_id
    ).strip()

    if not file_id:

        raise HTTPException(
            status_code=400,
            detail="File ID is required",
        )

    # --------------------------------------------------------
    # FIND IMPORT HISTORY USING FILE ID
    # --------------------------------------------------------

    import_record = (

        db.query(
            ImportHistory
        )

        .filter(
            ImportHistory.file_id
            ==
            file_id
        )

        .first()
    )

    # --------------------------------------------------------
    # IF IMPORT HISTORY EXISTS
    # --------------------------------------------------------

    if import_record:

        return delete_import_data(
            import_record,
            db,
        )

    # --------------------------------------------------------
    # FALLBACK:
    # DELETE ORPHANED PAYROLL FILE
    # --------------------------------------------------------

    payroll_record = find_payroll_file(
        file_id
    )

    if not payroll_record:

        raise HTTPException(
            status_code=404,
            detail="Payroll file not found",
        )

    stored_filename = (
        payroll_record.get(
            "stored_filename"
        )
    )

    try:

        # ----------------------------------------------------
        # DELETE PHYSICAL FILE
        # ----------------------------------------------------

        if stored_filename:

            safe_filename = Path(
                stored_filename
            ).name

            file_path = (
                PAYROLL_FOLDER /
                safe_filename
            )

            if file_path.exists():

                file_path.unlink(
                    missing_ok=True
                )

        # ----------------------------------------------------
        # REMOVE FROM PAYROLL INDEX
        # ----------------------------------------------------

        payroll_files = (
            load_payroll_index()
        )

        payroll_files = [

            item

            for item in payroll_files

            if str(
                item.get("id")
            )
            !=
            file_id
        ]

        save_payroll_index(
            payroll_files
        )

        return {

            "message":
                "Payroll file deleted successfully",

            "file_id":
                file_id,

            "deleted_employees":
                0,
        }

    except Exception as error:

        print(
            "Delete payroll file error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete payroll file",
        )


# ============================================================
# ADD EMPLOYEE MANUALLY
# ============================================================

@app.post(
    "/employees"
)
def add_employee(
    employee_data: dict,
    db: Session = Depends(get_db),
):

    name = employee_data.get(
        "name"
    )

    if (
        name is None
        or not str(name).strip()
    ):

        raise HTTPException(
            status_code=400,
            detail="Employee name is required",
        )

    name = str(
        name
    ).strip()

    team = employee_data.get(
        "team"
    )

    if (
        team is None
        or not str(team).strip()
    ):

        raise HTTPException(
            status_code=400,
            detail="Team is required",
        )

    team = normalize_team(
        team
    )

    if team is None:

        raise HTTPException(
            status_code=400,
            detail=invalid_team_message(),
        )

    employee_id = (
        employee_data.get(
            "employee_id"
        )
    )

    if employee_id is not None:

        employee_id = str(
            employee_id
        ).strip()

    if not employee_id:

        employee_id = (
            generate_employee_id(
                db
            )
        )

    existing_employee = (

        db.query(
            Employee
        )

        .filter(
            Employee.employee_id
            ==
            employee_id
        )

        .first()
    )

    if existing_employee:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Employee ID "
                f"'{employee_id}' "
                "already exists"
            ),
        )

    personal_email = (
        employee_data.get(
            "personal_email"
        )
    )

    if personal_email:

        personal_email = str(
            personal_email
        ).strip()

        existing_email = (

            db.query(
                Employee
            )

            .filter(
                Employee.personal_email
                ==
                personal_email
            )

            .first()
        )

        if existing_email:

            raise HTTPException(
                status_code=400,
                detail=(
                    "An employee with "
                    "this email already exists"
                ),
            )

    payroll_type = (
        normalize_payroll_type(
            employee_data.get(
                "payroll_type",
                "Salary",
            )
        )
    )

    if payroll_type is None:

        raise HTTPException(
            status_code=400,
            detail=(
                invalid_payroll_type_message()
            ),
        )

    employee = Employee(

        employee_id=employee_id,

        name=name,

        team=team,

        payroll_type=payroll_type,

        status="Active",
    )

    allowed_fields = [

        "serial_no",
        "name",
        "team",
        "grade",
        "performance",
        "designation",
        "project_name",
        "doj",
        "dob",
        "gender",
        "payroll_type",
        "salary",
        "stipend",
        "pf",
        "ctc",
        "contact_number",
        "personal_email",
        "name_as_per_aadhar",
        "aadhar_number",
        "father_name",
        "pan_no",
        "qualification",
        "bank_account_no",
        "ifsc_code",
        "branch",
        "pf_no",
        "uan_no",
        "remarks",
        "status",
    ]

    for field in allowed_fields:

        if field not in employee_data:
            continue

        value = (
            employee_data[field]
        )

        if value is None:
            continue

        if field == "team":

            value = normalize_team(
                value
            )

            if value is None:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        invalid_team_message()
                    ),
                )

        elif field == "payroll_type":

            value = (
                normalize_payroll_type(
                    value
                )
            )

            if value is None:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        invalid_payroll_type_message()
                    ),
                )

        elif field == "serial_no":

            try:

                value = int(
                    float(value)
                )

            except (
                ValueError,
                TypeError,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Invalid serial number"
                    ),
                )

        elif field in [
            "salary",
            "stipend",
            "pf",
            "ctc",
        ]:

            try:

                value = float(
                    value
                )

            except (
                ValueError,
                TypeError,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Invalid value "
                        f"for {field}"
                    ),
                )

        elif isinstance(
            value,
            str,
        ):

            value = value.strip()

        setattr(
            employee,
            field,
            value,
        )

    employee.team = team

    employee.payroll_type = (
        payroll_type
    )

    if payroll_type == "Salary":

        employee.stipend = None

    else:

        employee.salary = None

    if not employee.status:

        employee.status = "Active"

    try:

        db.add(
            employee
        )

        db.commit()

        db.refresh(
            employee
        )

    except IntegrityError as error:

        db.rollback()

        print(
            "Add employee integrity error:",
            error,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Employee could not be added. "
                "Employee ID or another unique "
                "value may already exist."
            ),
        )

    except Exception as error:

        db.rollback()

        print(
            "Add employee error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to add employee",
        )

    return {

        "message":
            "Employee added successfully",

        **employee_response(
            employee
        ),
    }


# ============================================================
# ALL EMPLOYEES
# ============================================================

@app.get(
    "/employees"
)
def get_employees(
    db: Session = Depends(get_db),
):

    employees = (

        db.query(
            Employee
        )

        .order_by(
            Employee.id.asc()
        )

        .all()
    )

    return [

        {

            "id":
                employee.id,

            "employee_id":
                employee.employee_id,

            "serial_no":
                employee.serial_no,

            "name":
                employee.name,

            "team":
                normalize_team(
                    employee.team
                ),

            "designation":
                employee.designation,

            "project_name":
                employee.project_name,

            "doj":
                employee.doj,

            "dob":
                employee.dob,

            "status":
                employee.status,

            "grade":
                employee.grade,

            "performance":
                employee.performance,

            "gender":
                employee.gender,

            "payroll_type":
                employee.payroll_type,

            "salary":
                employee.salary,

            "stipend":
                employee.stipend,
        }

        for employee in employees
    ]


# ============================================================
# EMPLOYEE PROFILE
# ============================================================

@app.get(
    "/employees/{employee_id}"
)
def get_employee(
    employee_id: str,
    db: Session = Depends(get_db),
):

    employee = (

        db.query(
            Employee
        )

        .filter(
            Employee.employee_id
            ==
            employee_id.strip()
        )

        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    return employee_response(
        employee
    )


# ============================================================
# UPDATE EMPLOYEE
# ============================================================

@app.put(
    "/employees/{employee_id}"
)
def update_employee(
    employee_id: str,
    employee_data: dict,
    db: Session = Depends(get_db),
):

    employee = (

        db.query(
            Employee
        )

        .filter(
            Employee.employee_id
            ==
            employee_id.strip()
        )

        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    allowed_fields = [

        "employee_id",
        "serial_no",
        "name",
        "team",
        "grade",
        "performance",
        "designation",
        "project_name",
        "doj",
        "dob",
        "gender",
        "payroll_type",
        "salary",
        "stipend",
        "pf",
        "ctc",
        "contact_number",
        "personal_email",
        "name_as_per_aadhar",
        "aadhar_number",
        "father_name",
        "pan_no",
        "qualification",
        "bank_account_no",
        "ifsc_code",
        "branch",
        "pf_no",
        "uan_no",
        "remarks",
        "status",
    ]

    for field in allowed_fields:

        if field not in employee_data:
            continue

        value = (
            employee_data[field]
        )

        if value is None:
            continue

        if field == "employee_id":

            value = str(
                value
            ).strip()

            if not value:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Employee ID "
                        "cannot be empty"
                    ),
                )

            if (
                value
                != employee.employee_id
            ):

                existing_employee = (

                    db.query(
                        Employee
                    )

                    .filter(
                        Employee.employee_id
                        ==
                        value
                    )

                    .first()
                )

                if existing_employee:

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Employee ID "
                            f"'{value}' "
                            "already exists"
                        ),
                    )

        elif field == "team":

            value = normalize_team(
                value
            )

            if value is None:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        invalid_team_message()
                    ),
                )

        elif field == "payroll_type":

            value = (
                normalize_payroll_type(
                    value
                )
            )

            if value is None:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        invalid_payroll_type_message()
                    ),
                )

        elif field == "serial_no":

            try:

                value = int(
                    float(value)
                )

            except (
                ValueError,
                TypeError,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Invalid value "
                        "for serial_no"
                    ),
                )

        elif field in [

            "salary",
            "stipend",
            "pf",
            "ctc",

        ]:

            try:

                value = float(
                    value
                )

            except (
                ValueError,
                TypeError,
            ):

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Invalid value "
                        f"for {field}"
                    ),
                )

        elif isinstance(
            value,
            str,
        ):

            value = value.strip()

        setattr(
            employee,
            field,
            value,
        )

    # --------------------------------------------------------
    # NORMALIZE TEAM
    # --------------------------------------------------------

    if employee.team:

        normalized_team = (
            normalize_team(
                employee.team
            )
        )

        if normalized_team is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    invalid_team_message()
                ),
            )

        employee.team = (
            normalized_team
        )

    # --------------------------------------------------------
    # NORMALIZE PAYROLL TYPE
    # --------------------------------------------------------

    if not employee.payroll_type:

        employee.payroll_type = (
            "Salary"
        )

    normalized_payroll_type = (
        normalize_payroll_type(
            employee.payroll_type
        )
    )

    if normalized_payroll_type is None:

        raise HTTPException(
            status_code=400,
            detail=(
                invalid_payroll_type_message()
            ),
        )

    employee.payroll_type = (
        normalized_payroll_type
    )

    # --------------------------------------------------------
    # SALARY / STIPEND MUTUAL EXCLUSION
    # --------------------------------------------------------

    if (
        employee.payroll_type
        == "Salary"
    ):

        employee.stipend = None

    else:

        employee.salary = None

    try:

        db.commit()

        db.refresh(
            employee
        )

    except IntegrityError as error:

        db.rollback()

        print(
            "Employee update integrity error:",
            error,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Employee ID or another "
                "unique value already exists"
            ),
        )

    except Exception as error:

        db.rollback()

        print(
            "Employee update error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update employee"
            ),
        )

    return {

        "message":
            "Employee updated successfully",

        **employee_response(
            employee
        ),
    }


# ============================================================
# UPDATE EMPLOYEE TEAM
# ============================================================

@app.put(
    "/employees/{employee_id}/team"
)
def update_employee_team(
    employee_id: str,
    team_data: dict,
    db: Session = Depends(get_db),
):

    employee = (

        db.query(
            Employee
        )

        .filter(
            Employee.employee_id
            ==
            employee_id.strip()
        )

        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    team = team_data.get(
        "team"
    )

    if team is None:

        raise HTTPException(
            status_code=400,
            detail="Team is required",
        )

    team = normalize_team(
        team
    )

    if team is None:

        raise HTTPException(
            status_code=400,
            detail=(
                invalid_team_message()
            ),
        )

    employee.team = team

    try:

        db.commit()

        db.refresh(
            employee
        )

    except Exception as error:

        db.rollback()

        print(
            "Team update error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update employee team"
            ),
        )

    return {

        "message":
            "Employee team updated successfully",

        "id":
            employee.id,

        "employee_id":
            employee.employee_id,

        "name":
            employee.name,

        "team":
            employee.team,
    }


# ============================================================
# TEAMS
# ============================================================

@app.get(
    "/teams"
)
def get_teams(
    db: Session = Depends(get_db),
):

    employees = (
        db.query(
            Employee
        ).all()
    )

    team_data = {

        "Networking": {

            "name":
                "Networking",

            "description":
                TEAM_DESCRIPTIONS[
                    "Networking"
                ],

            "count":
                0,
        },

        "AI": {

            "name":
                "AI",

            "description":
                TEAM_DESCRIPTIONS[
                    "AI"
                ],

            "count":
                0,
        },

        "HR": {

            "name":
                "HR",

            "description":
                TEAM_DESCRIPTIONS[
                    "HR"
                ],

            "count":
                0,
        },

        "Accounts": {

            "name":
                "Accounts",

            "description":
                TEAM_DESCRIPTIONS[
                    "Accounts"
                ],

            "count":
                0,
        },

        "Administration": {

            "name":
                "Administration",

            "description":
                TEAM_DESCRIPTIONS[
                    "Administration"
                ],

            "count":
                0,
        },
    }

    for employee in employees:

        if not is_active_employee(
            employee
        ):
            continue

        if not employee.team:
            continue

        normalized_team = (
            normalize_team(
                employee.team
            )
        )

        if normalized_team in team_data:

            team_data[
                normalized_team
            ][
                "count"
            ] += 1

    return list(
        team_data.values()
    )


# ============================================================
# TEAM EMPLOYEE HELPER
# ============================================================

def get_team_employee_data(
    team_name: str,
    db: Session,
):

    if not team_name:

        raise HTTPException(
            status_code=404,
            detail="Team not found",
        )

    requested_team = (
        team_name
        .strip()
        .lower()
    )

    display_team = (
        normalize_team(
            requested_team
        )
    )

    if display_team is None:

        raise HTTPException(
            status_code=404,
            detail="Team not found",
        )

    employees = (

        db.query(
            Employee
        )

        .filter(
            Employee.team.isnot(None)
        )

        .order_by(
            Employee.id.asc()
        )

        .all()
    )

    employees = [

        employee

        for employee in employees

        if is_active_employee(
            employee
        )

        and employee.team

        and normalize_team(
            employee.team
        )
        ==
        display_team
    ]

    return [

        {

            "id":
                employee.id,

            "employee_id":
                employee.employee_id,

            "serial_no":
                employee.serial_no,

            "name":
                employee.name,

            "team":
                display_team,

            "grade":
                employee.grade,

            "performance":
                employee.performance,

            "designation":
                employee.designation,

            "project_name":
                employee.project_name,

            "contact_number":
                employee.contact_number,

            "personal_email":
                employee.personal_email,

            "dob":
                employee.dob,

            "doj":
                employee.doj,

            "gender":
                employee.gender,

            "payroll_type":
                employee.payroll_type,

            "salary":
                employee.salary,

            "stipend":
                employee.stipend,

            "status":
                employee.status,
        }

        for employee in employees
    ]


# ============================================================
# TEAM EMPLOYEES
# ============================================================

@app.get(
    "/teams/{team_name}/employees"
)
def get_team_employees(
    team_name: str,
    db: Session = Depends(get_db),
):

    return get_team_employee_data(
        team_name,
        db,
    )


# ============================================================
# TEAM COMPATIBILITY ROUTE
# ============================================================

@app.get(
    "/teams/{team_name}"
)
def get_team_employees_short(
    team_name: str,
    db: Session = Depends(get_db),
):

    return get_team_employee_data(
        team_name,
        db,
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health"
)
def health_check():

    return {

        "status":
            "healthy",

        "service":
            "HR Dashboard API",
    }


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )