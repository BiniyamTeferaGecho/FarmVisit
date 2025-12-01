import React from 'react';
import Modal from '../Modal';
import LayerFarmVisitForm from './LayerFarmVisitForm';
import DairyFarmVisitForm from './DairyFarmVisitForm';

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
}) => {
  if (!open || !target) return null;

  const farmType = (target.FarmType || target.FarmTypeCode || '').toString().toUpperCase();
  const modalTitle = readOnly ? `View Filled Visit for ${target.FarmName} (${farmType})` : `Fill Visit for ${target.FarmName} (${farmType})`;

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <div className="max-h-[70vh] overflow-auto w-full">
        {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}
        {farmType === 'LAYER' && (
          <LayerFarmVisitForm
            form={layerForm}
            onChange={onLayerFormChange}
            onSave={onSaveLayer}
            onCancel={onClose}
            loading={loading}
            readOnly={readOnly}
            locationReadOnlyInModal={true}
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
            locationReadOnlyInModal={true}
          />
        )}
        {!['LAYER', 'DAIRY'].includes(farmType) && (
            <p className="p-4 text-center text-gray-500">No specific form available for farm type: {farmType}</p>
        )}
      </div>
    </Modal>
  );
};

export default FillVisitModal;