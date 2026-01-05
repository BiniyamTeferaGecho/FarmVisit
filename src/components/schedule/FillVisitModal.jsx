import React from 'react';
import Modal from '../Modal';
import LayerFarmVisitForm from './LayerFarmVisitForm';
import DairyFarmVisitForm from './DairyFarmVisitForm';
import LayerVisitPrintForm from '../print/forms/LayerVisitPrintForm'
import DairyVisitPrintForm from '../print/forms/DairyVisitPrintForm'
import VisitSchedulePrintForm from '../print/forms/VisitSchedulePrintForm'

const FillVisitModal = ({
  open,
  onClose,
  target,
  layerForm,
  dairyForm,
  onLayerFormChange,
  onDairyFormChange,
  onSaveLayer,
  onSaveDairy,
  loading,
  error,
  readOnly = false,
  externalErrors = {},
  // allow parent to control whether Location is editable within the modal
  locationReadOnlyInModal = true,
}) => {
  if (!open || !target) return null;

  const farmType = (target.FarmType || target.FarmTypeCode || '').toString().toUpperCase();
  const modalTitle = readOnly ? `View Filled Visit for ${target.FarmName} (${farmType})` : `Fill Visit for ${target.FarmName} (${farmType})`;

  const [activeTab, setActiveTab] = React.useState('form')

  // Reset tab when modal opens/closes
  React.useEffect(() => { if (!open) setActiveTab('form') }, [open])

  const visitCode = (target && (target.VisitCode || target.VisitCodeName || target.ScheduleID || target.ScheduleId || target.id)) || ''

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <div className="max-h-[70vh] overflow-auto w-full">
        {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setActiveTab('form')} className={`px-3 py-1 rounded ${activeTab==='form' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Form</button>
          <button type="button" onClick={() => setActiveTab('print')} className={`px-3 py-1 rounded ${activeTab==='print' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Print Data</button>
        </div>

        {activeTab === 'form' && (
          <>
            {farmType === 'LAYER' && (
              <LayerFarmVisitForm
                form={layerForm}
                onChange={onLayerFormChange}
                onSave={onSaveLayer}
                onCancel={onClose}
                loading={loading}
                readOnly={readOnly}
                locationReadOnlyInModal={locationReadOnlyInModal}
                externalErrors={externalErrors?.layerForm || {}}
              />
            )}
            {farmType === 'DAIRY' && (
              <DairyFarmVisitForm
                form={dairyForm}
                onChange={onDairyFormChange}
                onSave={onSaveDairy}
                onCancel={onClose}
                loading={loading}
                readOnly={readOnly}
                locationReadOnlyInModal={locationReadOnlyInModal}
                externalErrors={externalErrors?.dairyForm || {}}
              />
            )}
            {!['LAYER', 'DAIRY'].includes(farmType) && (
                <p className="p-4 text-center text-gray-500">No specific form available for farm type: {farmType}</p>
            )}
          </>
        )}

        {activeTab === 'print' && (
          <>
            {farmType === 'LAYER' && <LayerVisitPrintForm visitCode={visitCode} />}
            {farmType === 'DAIRY' && <DairyVisitPrintForm visitCode={visitCode} />}
            {/* Generic schedule print view is useful when target is a schedule */}
            {(!['LAYER','DAIRY'].includes(farmType) || !visitCode) && <VisitSchedulePrintForm visitCode={visitCode} />}
          </>
        )}
      </div>
    </Modal>
  );
};

export default FillVisitModal;