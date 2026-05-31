#!/usr/bin/env python3
"""
Omega Demo Upload Script
Full matrix: Print × Negative × Dye × Variant
Uploads to Cloudflare R2 for the demo
"""

import os
import shutil
import subprocess
from pathlib import Path

# Source directory (full render output)
SOURCE_DIR = Path("/Users/alecwisdom/Documents/New project/omega_output_all")

# Staging directory
STAGING_DIR = Path("/Users/alecwisdom/Documents/Monos Pros Monon/00_Company/02_Founder/00_Portfolio/Website/monosprosmonon.com/omega-demo-staging")

# R2 bucket
R2_REMOTE = "r2:omega-demo"

# Print stock mapping (folder name to ID)
PRINTS = {
    "print_01_Kodak_Vision_2383_2002": "01",
    "print_02_Kodak_Vision_Premier_2393_2004": "02",
    "print_03_Kodak_Intermediate_5383_1979": "03",
    "print_04_Kodak_ECP_5381_1974": "04",
    "print_05_Kodak_ECP_5384_1984": "05",
    "print_06_Kodak_EXR_5386_1989": "06",
    "print_07_Kodak_2303_BW_1979": "07",
    "print_08_Kodak_Duraflex_Plus_1995": "08",
    "print_09_Kodak_Endura_Premier_2003": "09",
    "print_10_Kodak_Portra_Endura_2003": "10",
    "print_11_Kodak_Supra_Endura_2003": "11",
    "print_12_Fuji_3513DI_2002": "12",
    "print_13_Fujiflex_Old_1988": "13",
    "print_14_Fuji_Crystal_Archive_SuperC_1996": "14",
    "print_15_Fuji_Crystal_Archive_DP_II_1998": "15",
    "print_16_Fuji_Crystal_Archive_Maxima_2000": "16",
    "print_17_Fujiflex_New_2001": "17",
    "print_18_Fuji_Crystal_Archive_Pro_PD_II_2002": "18",
    "print_19_Technicolor_V_1932": "19",
}

# Negative stock mapping
NEGATIVES = {
    "neg_00_5203_50D": "00",
    "neg_01_5207_250D": "01",
    "neg_02_5213_200T": "02",
    "neg_03_5219_500T": "03",
    "neg_04_ECN_5247_1950": "04",
    "neg_05_ECN_5248_1952": "05",
    "neg_06_ECN2_5247_1974": "06",
    "neg_07_ECN2_5250_50D": "07",
    "neg_08_ECN2_5277_400T": "08",
    "neg_09_EXR_5293_200T": "09",
    "neg_10_EXR_5248_100T": "10",
    "neg_11_DoubleX_5222_BW": "11",
    "neg_12_Portra_160": "12",
    "neg_13_Portra_400": "13",
    "neg_14_Portra_800": "14",
    "neg_15_Ektar_100": "15",
    "neg_16_Gold_200": "16",
    "neg_17_Ultramax_400": "17",
    "neg_18_Vericolor_III": "18",
    "neg_19_Aerocolor_IV": "19",
    "neg_20_Kodachrome_64": "20",
    "neg_21_Ektachrome_E100": "21",
    "neg_22_Ektachrome_100D": "22",
    "neg_23_TriX_400_BW": "23",
    "neg_24_Eterna_500T": "24",
    "neg_25_Eterna_500T_Vivid": "25",
    "neg_26_Pro_400H": "26",
    "neg_27_Pro_160C": "27",
    "neg_28_Pro_160S": "28",
    "neg_29_C200": "29",
    "neg_30_Superia_400": "30",
    "neg_31_Superia_Xtra_400": "31",
    "neg_32_Superia_Reala": "32",
    "neg_33_Natura_1600": "33",
    "neg_34_Provia_100F": "34",
    "neg_35_Velvia_50": "35",
    "neg_36_FP100C": "36",
    "neg_37_Instax": "37",
    "neg_38_Vista_100": "38",
    "neg_39_Optima_100": "39",
    "neg_40_Lomo_400": "40",
    "neg_41_CineStill_800T": "41",
}

# Dye process mapping
DYES = {
    "dye_00_NONE": "00",
    "dye_01_Dye_01": "01",
    "dye_02_Dye_02": "02",
    "dye_03_Dye_03": "03",
    "dye_04_Dye_04": "04",
    "dye_05_Dye_05": "05",
    "dye_06_Dye_06": "06",
    "dye_07_Dye_07": "07",
    "dye_08_Dye_08": "08",
    "dye_09_Dye_09": "09",
}

VARIANTS = ["none", "grain", "halation", "both"]


def flatten_full_matrix():
    """Copy full matrix to staging directory with flat naming"""
    STAGING_DIR.mkdir(parents=True, exist_ok=True)

    count = 0
    for print_folder in sorted(SOURCE_DIR.iterdir()):
        if not print_folder.is_dir() or not print_folder.name.startswith("print_"):
            continue

        print_id = None
        for folder_name, pid in PRINTS.items():
            if print_folder.name == folder_name:
                print_id = pid
                break

        if not print_id:
            # Try to extract ID from folder name
            parts = print_folder.name.split("_")
            if len(parts) >= 2 and parts[1].isdigit():
                print_id = parts[1].zfill(2)
            else:
                print(f"⚠️  Unknown print: {print_folder.name}")
                continue

        for variant in VARIANTS:
            variant_path = print_folder / f"variant_{variant}"
            if not variant_path.exists():
                continue

            for neg_folder in sorted(variant_path.iterdir()):
                if not neg_folder.is_dir():
                    continue

                neg_id = None
                for folder_name, nid in NEGATIVES.items():
                    if neg_folder.name == folder_name:
                        neg_id = nid
                        break

                if not neg_id:
                    parts = neg_folder.name.split("_")
                    if len(parts) >= 2 and parts[1].isdigit():
                        neg_id = parts[1].zfill(2)
                    else:
                        continue

                for dye_folder in sorted(neg_folder.iterdir()):
                    if not dye_folder.is_dir():
                        continue

                    dye_id = None
                    for folder_name, did in DYES.items():
                        if dye_folder.name == folder_name:
                            dye_id = did
                            break

                    if not dye_id:
                        parts = dye_folder.name.split("_")
                        if len(parts) >= 2 and parts[1].isdigit():
                            dye_id = parts[1].zfill(2)
                        else:
                            continue

                    # Find image file
                    images = list(dye_folder.glob("*.webp"))
                    if not images:
                        continue

                    src = images[0]
                    # Naming: neg_XX_print_YY_dye_ZZ_variant.webp
                    dst = STAGING_DIR / f"neg_{neg_id}_print_{print_id}_dye_{dye_id}_{variant}.webp"

                    shutil.copy2(src, dst)
                    count += 1

                    if count % 100 == 0:
                        print(f"  Copied {count} images...")

    print(f"\n✓ Copied {count} images to staging")
    return count


def flatten_subset(neg_id="03", dye_id="00"):
    """Copy subset (single negative + dye, all prints, all variants) to staging"""
    STAGING_DIR.mkdir(parents=True, exist_ok=True)

    # Find matching negative folder name
    neg_folder_name = None
    for folder_name, nid in NEGATIVES.items():
        if nid == neg_id:
            neg_folder_name = folder_name
            break

    if not neg_folder_name:
        neg_folder_name = f"neg_{neg_id}_5219_500T"  # Default fallback

    # Find matching dye folder name
    dye_folder_name = None
    for folder_name, did in DYES.items():
        if did == dye_id:
            dye_folder_name = folder_name
            break

    if not dye_folder_name:
        dye_folder_name = f"dye_{dye_id}_NONE"

    count = 0
    for print_folder in sorted(SOURCE_DIR.iterdir()):
        if not print_folder.is_dir() or not print_folder.name.startswith("print_"):
            continue

        # Extract print ID
        parts = print_folder.name.split("_")
        if len(parts) >= 2:
            print_id = parts[1].zfill(2)
        else:
            continue

        for variant in VARIANTS:
            variant_path = print_folder / f"variant_{variant}" / neg_folder_name / dye_folder_name

            if not variant_path.exists():
                # Try to find any matching negative folder
                variant_parent = print_folder / f"variant_{variant}"
                if not variant_parent.exists():
                    continue
                for neg_folder in variant_parent.iterdir():
                    if neg_folder.name.startswith(f"neg_{neg_id}"):
                        dye_path = neg_folder / dye_folder_name
                        if not dye_path.exists():
                            for df in neg_folder.iterdir():
                                if df.name.startswith(f"dye_{dye_id}"):
                                    variant_path = df
                                    break
                        else:
                            variant_path = dye_path
                        break

            if not variant_path.exists():
                continue

            images = list(variant_path.glob("*.webp"))
            if not images:
                continue

            src = images[0]
            # Simple naming for subset: print_XX_variant.webp
            dst = STAGING_DIR / f"print_{print_id}_{variant}.webp"

            shutil.copy2(src, dst)
            count += 1
            print(f"✓ {dst.name}")

    print(f"\n✓ Copied {count} images to staging")
    return count


def upload_to_r2():
    """Upload staging directory to R2 using AWS CLI"""
    print(f"\nUploading to R2 bucket: omega-demo...")

    R2_ENDPOINT = os.environ.get("R2_ENDPOINT", "https://<ACCOUNT_ID>.r2.cloudflarestorage.com")
    BUCKET = "omega-demo"

    if "<ACCOUNT_ID>" in R2_ENDPOINT:
        print("⚠️  Set R2_ENDPOINT environment variable:")
        print("  export R2_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com")
        print("\nOr set AWS credentials for R2:")
        print("  export AWS_ACCESS_KEY_ID=<your-r2-access-key>")
        print("  export AWS_SECRET_ACCESS_KEY=<your-r2-secret-key>")
        return

    for webp in sorted(STAGING_DIR.glob("*.webp")):
        cmd = [
            "aws", "s3", "cp",
            str(webp),
            f"s3://{BUCKET}/{webp.name}",
            "--endpoint-url", R2_ENDPOINT,
            "--content-type", "image/webp"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ {webp.name}")
        else:
            print(f"  ✗ {webp.name}: {result.stderr}")

    print("\n✓ Upload complete")
    print(f"\nImages available at: https://omega-demo.monosprosmonon.com/")


def main():
    print("=" * 60)
    print("Omega Demo Upload Script")
    print("Full Matrix: Print × Negative × Dye × Variant")
    print("=" * 60)
    print()

    print("Options:")
    print("  1. Subset (5219 neg, no dye, all prints, all variants) - ~32 images")
    print("  2. Full matrix (all combinations) - ~12,000+ images")
    print()

    choice = input("Choose option [1/2]: ").strip()

    if choice == "2":
        print("\n⚠️  Full matrix selected. This will copy ~12,000+ images.")
        confirm = input("Continue? [y/N] ").strip().lower()
        if confirm != 'y':
            print("Cancelled.")
            return
        count = flatten_full_matrix()
    else:
        count = flatten_subset(neg_id="03", dye_id="00")

    if count == 0:
        print("No images found. Check source directory.")
        return

    print(f"\nStaging complete. Review images in:")
    print(f"  {STAGING_DIR}")
    print()

    response = input("Upload to R2? [y/N] ").strip().lower()
    if response == 'y':
        upload_to_r2()
    else:
        print("Skipped upload. Run manually with:")
        print(f"  rclone sync {STAGING_DIR} {R2_REMOTE}")


if __name__ == "__main__":
    main()
