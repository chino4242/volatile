import boto3
import pandas as pd
from io import BytesIO

# Download and check column names in the February files
s3 = boto3.client('s3')
bucket = 'amplify-volatileworkspace-provinggrounddatabucket4-futv0ur6nryf'

# Check 1QB file
print("=== 1QB File ===")
obj_1qb = s3.get_object(Bucket=bucket, Key='uploads/1QB/dynasty/1771262887062_1QBRankings_February26.xlsx')
df_1qb = pd.read_excel(BytesIO(obj_1qb['Body'].read()), engine='openpyxl')
print(f"Columns: {list(df_1qb.columns)}")
print(f"First 3 rows:\n{df_1qb.head(3)}\n")

# Check Superflex file  
print("=== Superflex File ===")
obj_sf = s3.get_object(Bucket=bucket, Key='uploads/superflex/1771262881754_SuperflexRankings_February26.xlsx')
df_sf = pd.read_excel(BytesIO(obj_sf['Body'].read()), engine='openpyxl')
print(f"Columns: {list(df_sf.columns)}")
print(f"First 3 rows:\n{df_sf.head(3)}")
