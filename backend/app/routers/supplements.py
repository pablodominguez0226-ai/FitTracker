import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter()

# ====================================================================
# 1. SUPLEMENTOS (CRUD & TODAY CHECKLIST)
# ====================================================================

@router.get("", response_model=list[schemas.SupplementOut])
def get_supplements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    date_str: str | None = None,
):
    """Obtiene la lista de suplementos del usuario con el estado consumido hoy."""
    target_date = dt.date.today()
    if date_str:
        try:
            target_date = dt.date.fromisoformat(date_str)
        except ValueError:
            pass

    supplements = (
        db.query(models.Supplement)
        .filter(models.Supplement.user_id == current_user.id)
        .order_by(models.Supplement.is_active.desc(), models.Supplement.name.asc())
        .all()
    )

    # Buscar logs de la fecha objetivo
    today_logs = (
        db.query(models.SupplementLog)
        .filter(
            models.SupplementLog.user_id == current_user.id,
            models.SupplementLog.date == target_date,
            models.SupplementLog.taken == True,
        )
        .all()
    )
    taken_supp_ids = {log.supplement_id for log in today_logs}

    result = []
    for s in supplements:
        out = schemas.SupplementOut.model_validate(s)
        out.taken_today = s.id in taken_supp_ids
        result.append(out)

    return result


@router.post("", response_model=schemas.SupplementOut, status_code=status.HTTP_201_CREATED)
def create_supplement(
    payload: schemas.SupplementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Crea un nuevo suplemento."""
    supp = models.Supplement(
        user_id=current_user.id,
        name=payload.name.strip(),
        dose=payload.dose.strip(),
        timing=payload.timing.strip(),
        is_active=payload.is_active,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(supp)
    db.commit()
    db.refresh(supp)
    out = schemas.SupplementOut.model_validate(supp)
    out.taken_today = False
    return out


@router.put("/{supplement_id}", response_model=schemas.SupplementOut)
def update_supplement(
    supplement_id: int,
    payload: schemas.SupplementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Actualiza los datos de un suplemento."""
    supp = (
        db.query(models.Supplement)
        .filter(models.Supplement.id == supplement_id, models.Supplement.user_id == current_user.id)
        .first()
    )
    if not supp:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado.")

    if payload.name is not None:
        supp.name = payload.name.strip()
    if payload.dose is not None:
        supp.dose = payload.dose.strip()
    if payload.timing is not None:
        supp.timing = payload.timing.strip()
    if payload.is_active is not None:
        supp.is_active = payload.is_active

    db.commit()
    db.refresh(supp)
    out = schemas.SupplementOut.model_validate(supp)
    return out


@router.delete("/{supplement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplement(
    supplement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un suplemento."""
    supp = (
        db.query(models.Supplement)
        .filter(models.Supplement.id == supplement_id, models.Supplement.user_id == current_user.id)
        .first()
    )
    if not supp:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado.")
    db.delete(supp)
    db.commit()
    return None


@router.post("/{supplement_id}/toggle-today", response_model=schemas.SupplementOut)
def toggle_supplement_today(
    supplement_id: int,
    payload: schemas.SupplementToggleTodayRequest | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Marca o desmarca el suplemento como consumido hoy."""
    supp = (
        db.query(models.Supplement)
        .filter(models.Supplement.id == supplement_id, models.Supplement.user_id == current_user.id)
        .first()
    )
    if not supp:
        raise HTTPException(status_code=404, detail="Suplemento no encontrado.")

    target_date = payload.date if payload and payload.date else dt.date.today()

    log = (
        db.query(models.SupplementLog)
        .filter(
            models.SupplementLog.user_id == current_user.id,
            models.SupplementLog.supplement_id == supplement_id,
            models.SupplementLog.date == target_date,
        )
        .first()
    )

    if log:
        if payload and payload.taken is not None:
            log.taken = payload.taken
        else:
            log.taken = not log.taken
        log.taken_at = dt.datetime.now(dt.timezone.utc)
    else:
        new_taken = True if not payload or payload.taken is None else payload.taken
        log = models.SupplementLog(
            user_id=current_user.id,
            supplement_id=supplement_id,
            date=target_date,
            taken=new_taken,
            taken_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(log)

    db.commit()
    db.refresh(log)

    out = schemas.SupplementOut.model_validate(supp)
    out.taken_today = bool(log.taken)
    return out


@router.get("/today/checklist", response_model=schemas.SupplementChecklistTodayOut)
def get_today_checklist(
    date_str: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene el checklist interactivo de suplementos del día con porcentaje."""
    target_date = dt.date.today()
    if date_str:
        try:
            target_date = dt.date.fromisoformat(date_str)
        except ValueError:
            pass

    active_supps = (
        db.query(models.Supplement)
        .filter(models.Supplement.user_id == current_user.id, models.Supplement.is_active == True)
        .order_by(models.Supplement.timing.asc(), models.Supplement.name.asc())
        .all()
    )

    logs = (
        db.query(models.SupplementLog)
        .filter(
            models.SupplementLog.user_id == current_user.id,
            models.SupplementLog.date == target_date,
            models.SupplementLog.taken == True,
        )
        .all()
    )
    taken_ids = {log.supplement_id for log in logs}

    items = []
    for s in active_supps:
        items.append(
            schemas.SupplementTodayItem(
                id=s.id,
                name=s.name,
                dose=s.dose,
                timing=s.timing,
                taken=s.id in taken_ids,
            )
        )

    total = len(items)
    completed = sum(1 for it in items if it.taken)
    percent = int((completed / total) * 100) if total > 0 else 0

    return schemas.SupplementChecklistTodayOut(
        date=target_date,
        total=total,
        completed=completed,
        percent=percent,
        items=items,
    )


# ====================================================================
# 2. QUÍMICA / FARMACOLOGÍA DEPORTIVA (PEDS)
# ====================================================================

DAY_MAP = {
    0: "lunes",
    1: "martes",
    2: "miércoles",
    3: "jueves",
    4: "viernes",
    5: "sábado",
    6: "domingo",
}

@router.get("/chemistry", response_model=list[schemas.ChemistryCompoundOut])
def get_chemistry_compounds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene los compuestos del ciclo actual con recordatorio si toca hoy."""
    compounds = (
        db.query(models.ChemistryCompound)
        .filter(models.ChemistryCompound.user_id == current_user.id)
        .order_by(models.ChemistryCompound.is_active.desc(), models.ChemistryCompound.created_at.desc())
        .all()
    )

    today_idx = dt.date.today().weekday()
    today_name = DAY_MAP.get(today_idx, "").lower()

    result = []
    for c in compounds:
        out = schemas.ChemistryCompoundOut.model_validate(c)
        app_days_lower = (c.application_days or "").lower()
        out.is_application_today = (
            today_name in app_days_lower or
            today_name.replace("é", "e") in app_days_lower
        )
        result.append(out)

    return result


@router.post("/chemistry", response_model=schemas.ChemistryCompoundOut, status_code=status.HTTP_201_CREATED)
def create_chemistry_compound(
    payload: schemas.ChemistryCompoundCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Registra un nuevo compuesto químico."""
    comp = models.ChemistryCompound(
        user_id=current_user.id,
        name=payload.name.strip(),
        weekly_dose=payload.weekly_dose.strip(),
        dose_unit=payload.dose_unit.strip() if payload.dose_unit else "mg",
        application_days=payload.application_days.strip(),
        notes=payload.notes,
        is_active=payload.is_active,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return schemas.ChemistryCompoundOut.model_validate(comp)


@router.put("/chemistry/{compound_id}", response_model=schemas.ChemistryCompoundOut)
def update_chemistry_compound(
    compound_id: int,
    payload: schemas.ChemistryCompoundUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Actualiza un compuesto químico."""
    comp = (
        db.query(models.ChemistryCompound)
        .filter(models.ChemistryCompound.id == compound_id, models.ChemistryCompound.user_id == current_user.id)
        .first()
    )
    if not comp:
        raise HTTPException(status_code=404, detail="Compuesto no encontrado.")

    if payload.name is not None:
        comp.name = payload.name.strip()
    if payload.weekly_dose is not None:
        comp.weekly_dose = payload.weekly_dose.strip()
    if payload.dose_unit is not None:
        comp.dose_unit = payload.dose_unit.strip()
    if payload.application_days is not None:
        comp.application_days = payload.application_days.strip()
    if payload.notes is not None:
        comp.notes = payload.notes
    if payload.is_active is not None:
        comp.is_active = payload.is_active

    db.commit()
    db.refresh(comp)
    return schemas.ChemistryCompoundOut.model_validate(comp)


@router.delete("/chemistry/{compound_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chemistry_compound(
    compound_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un compuesto químico."""
    comp = (
        db.query(models.ChemistryCompound)
        .filter(models.ChemistryCompound.id == compound_id, models.ChemistryCompound.user_id == current_user.id)
        .first()
    )
    if not comp:
        raise HTTPException(status_code=404, detail="Compuesto no encontrado.")
    db.delete(comp)
    db.commit()
    return None


# ====================================================================
# 3. ANÁLISIS DE LABORATORIO (LAB ANALYSES)
# ====================================================================

@router.get("/analyses", response_model=schemas.LabAnalysesSummaryOut)
def get_lab_analyses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene el historial de análisis de laboratorio y alerta del tiempo transcurrido."""
    analyses = (
        db.query(models.LabAnalysis)
        .filter(models.LabAnalysis.user_id == current_user.id)
        .order_by(desc(models.LabAnalysis.date), desc(models.LabAnalysis.id))
        .all()
    )

    items = [schemas.LabAnalysisOut.model_validate(a) for a in analyses]

    latest_date = items[0].date if items else None
    days_since_last = None
    alert_level = "critical"
    alert_message = "No registras ningún análisis de sangre. Se recomienda realizar un chequeo preventivo."

    if latest_date:
        today = dt.date.today()
        days_since_last = (today - latest_date).days
        if days_since_last <= 90:
            alert_level = "ok"
            alert_message = f"Análisis al día (último hace {days_since_last} días)."
        elif days_since_last <= 180:
            alert_level = "warning"
            alert_message = f"Han transcurrido {days_since_last} días (~{days_since_last // 30} meses) desde el último análisis. Es conveniente programar un control."
        else:
            alert_level = "critical"
            alert_message = f"¡Alerta! Hace {days_since_last} días (~{days_since_last // 30} meses) de tu último análisis. Realiza un chequeo urgente (Hematocrito, Transaminasas, Perfil Lipídico)."

    return schemas.LabAnalysesSummaryOut(
        analyses=items,
        latest_date=latest_date,
        days_since_last=days_since_last,
        alert_level=alert_level,
        alert_message=alert_message,
    )


@router.post("/analyses", response_model=schemas.LabAnalysisOut, status_code=status.HTTP_201_CREATED)
def create_lab_analysis(
    payload: schemas.LabAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Registra un nuevo análisis clínico."""
    analysis = models.LabAnalysis(
        user_id=current_user.id,
        date=payload.date,
        hematocrit=payload.hematocrit,
        got_ast=payload.got_ast,
        gpt_alt=payload.gpt_alt,
        total_cholesterol=payload.total_cholesterol,
        hdl=payload.hdl,
        ldl=payload.ldl,
        triglycerides=payload.triglycerides,
        testosterone=payload.testosterone,
        notes=payload.notes,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return schemas.LabAnalysisOut.model_validate(analysis)


@router.put("/analyses/{analysis_id}", response_model=schemas.LabAnalysisOut)
def update_lab_analysis(
    analysis_id: int,
    payload: schemas.LabAnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Actualiza los valores de un análisis de laboratorio."""
    analysis = (
        db.query(models.LabAnalysis)
        .filter(models.LabAnalysis.id == analysis_id, models.LabAnalysis.user_id == current_user.id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado.")

    if payload.date is not None:
        analysis.date = payload.date
    if payload.hematocrit is not None:
        analysis.hematocrit = payload.hematocrit
    if payload.got_ast is not None:
        analysis.got_ast = payload.got_ast
    if payload.gpt_alt is not None:
        analysis.gpt_alt = payload.gpt_alt
    if payload.total_cholesterol is not None:
        analysis.total_cholesterol = payload.total_cholesterol
    if payload.hdl is not None:
        analysis.hdl = payload.hdl
    if payload.ldl is not None:
        analysis.ldl = payload.ldl
    if payload.triglycerides is not None:
        analysis.triglycerides = payload.triglycerides
    if payload.testosterone is not None:
        analysis.testosterone = payload.testosterone
    if payload.notes is not None:
        analysis.notes = payload.notes

    db.commit()
    db.refresh(analysis)
    return schemas.LabAnalysisOut.model_validate(analysis)


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un análisis de laboratorio."""
    analysis = (
        db.query(models.LabAnalysis)
        .filter(models.LabAnalysis.id == analysis_id, models.LabAnalysis.user_id == current_user.id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado.")
    db.delete(analysis)
    db.commit()
    return None
