import io

import boto3
import openpyxl
import pandas as pd
from io import BytesIO
from botocore.exceptions import ClientError


AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
S3_BUCKET_NAME="mi-pmo-dnd"

s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
bucket_name = S3_BUCKET_NAME

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from typing import Any, List

def _parse_excel_bytes(content: bytes) -> dict[str, Any]:
    """Parse Excel bytes into {data, columns} like upload-activity-trend."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        if not ws:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Excel has no active sheet")
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse Excel: {e!s}",
        ) from e

    if not rows:
        return {"data": [], "columns": []}

    headers = [str(c).strip() if c is not None else f"col_{i}" for i, c in enumerate(rows[0])]
    data: List[dict[str, Any]] = []
    for row in rows[1:]:
        obj: dict[str, Any] = {}
        for i, val in enumerate(row):
            key = headers[i] if i < len(headers) else f"col_{i}"
            if val is not None:
                obj[key] = val
        data.append(obj)
    return {"data": data, "columns": headers}


PRM_EXCEL_KEY = "prm/vault/mi-data-bank/MI Data Bank - PRM.xlsx"

try:
    response = s3_client.get_object(Bucket=bucket_name, Key=PRM_EXCEL_KEY)
    data = response["Body"].read()

    df = pd.read_excel(BytesIO(data))
    print(df.head())
    x =  _parse_excel_bytes(data)
    print(f"xxxxxxxxxxxxx: {x}")
except ClientError as e:
        print(f"Error downloading file from S3: {e}")
