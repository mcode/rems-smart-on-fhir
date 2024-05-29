import {
  DiagnosticReport,
  Extension,
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  Reference,
  Resource,
  ValueSet
} from 'fhir/r4';
import Client from 'fhirclient/lib/Client';

type LFormType = {
  contained: (ValueSet | Resource)[];
  date: string;
  extension: Extension[];
  fhirVersion: 'R4' | string;
  id: string;
  items: {
    header: unknown;
    dataType: unknown;
    question: unknown;
    questionCode: unknown;
    questionCodeSystem: unknown;
    linkId: unknown;
    questionCardinality: unknown;
    displayControl: unknown;
    items: unknown;
  }[];
  lformsVersion: string;
  name: string;
  publisher: string;
  shortName: string;
  status: Questionnaire['status'];
  subjectType: Patient['resourceType'];
  templateOptions?: {
    showFormHeader: boolean;
    showColumnHeaders: boolean;
    showQuestionCode: boolean;
    hideFormControls: boolean;
    showFormOptionPanelButton: boolean;
  };
};
export type LForms = {
  lformsVersion: string;
  Util: {
    _convertLFormsToFHIRData: (
      resourceType: 'DiagnosticReport' | 'Questionnaire' | 'QuestionnaireResponse',
      fhirVersion: 'STU3' | 'R4',
      formDataSource?: Element | string | LFormType,
      options?: {
        bundleType: 'transaction' | 'collection';
        noExtensions: boolean;
        extract: boolean;
        subject: string;
      }
    ) => DiagnosticReport | Questionnaire | QuestionnaireResponse;
    _fhirVersionToRelease: (versionStr: string) => 'R5' | 'R4B' | 'R4' | 'STU3' | string;
    _getFormObjectInScope: (element: HTMLElement | string) => LFormType;
    _pruneObject: (
      keyRegex: RegExp,
      obj: Record<string, unknown>,
      recursiveKey?: string
    ) => Record<string, unknown>;
    _requireValidFHIRVersion: (fhirVersion: string, fhirResource: Resource) => string | Error;
    _testValues: (
      obj: Record<string, unknown>,
      property: string,
      valTest: (value: unknown) => boolean
    ) => boolean;
    addFormToPage: (
      formDataDef: LFormType,
      formContainer: string,
      options?: {
        showQuestionCode: boolean;
        showCodingInstruction: boolean;
        allowMultipleEmptyRepeatingItems: boolean;
        allowHTMLInInstructions: boolean;
        defaultAnswer: boolean;
        displayControl: boolean;
        viewMode: boolean;
        defaultAnswerLayout: boolean;
        hideTreeLine: boolean;
        hideIndentation: boolean;
        hideRepetitionNumber: boolean;
        displayScoreWithAnswerText: boolean;
        displayInvalidHTML: boolean;
      }
    ) => Promise<void>;
    baseFormDef: () => { lformsVersion: string };
    checkValidity: () => string[] | null;
    convertFHIRQuestionnaireToLForms: (
      fhirData: Questionnaire,
      fhirVersion: '2.0' | '3.0' | '4.0' | string
    ) => LFormType;
    createLocalFHIRReference: (fhirRes: Resource) => Reference;
    dateToDTMString: (objDate: Date) => string;
    dateToDTStringISO: (dateObj: Date) => string;
    deepCopy: (sourceObj: Record<string, unknown>) => Record<string, unknown>;
    detectFHIRVersion: (
      fhirData: Questionnaire | QuestionnaireResponse
    ) => 'STU3' | 'R4' | 'R5' | null;
    FHIRSupport: Record<'STU3' | 'R4' | 'R4B' | 'R5', 'partial' | 'WIP'>;
    findItem: (
      items: LFormType['items'][],
      key: string,
      matchingValue: unknown
    ) => LFormType['items'];
    findObjectInArray: (
      targetObjects: Record<string, unknown>[],
      key: string,
      matchingValue: unknown,
      starting_index: number,
      all: boolean
    ) => Record<string, unknown>;
    formatDate: (date: Date) => string;
    getAnswersResourceStatus: (formDataSource: HTMLElement | string) => string[];
    getCodeSystem: (e: unknown) => unknown;
    getFormData: (e: unknown, t: unknown, n: unknown) => unknown;
    getFormFHIRData: (
      resourceType: 'DiagnosticReport' | 'Questionnaire' | 'QuestionnaireResponse',
      resourceId: string,
      formDataSource?: HTMLElement | string
    ) => DiagnosticReport | Questionnaire | QuestionnaireResponse;
    getFormHL7Data: (element: HTMLElement | string) => string;
    getNextLetter: (index: number) => string;
    getServerFHIRReleaseID: (callback: (version?: string) => void) => string;
    getUserData: (
      element: HTMLElement | string,
      noFormDefData: boolean,
      noEmptyValue: boolean,
      noDisabledItem: boolean
    ) => { itemsData: unknown[]; templateData: unknown[] };
    guessFHIRVersion: (
      fhirData: Questionnaire | QuestionnaireResponse
    ) => 'R5' | 'R4' | 'STU3' | null;
    initializeCodes: (formOrItem: LFormType | LFormType['items']) => LFormType | LFormType['items'];
    isItemValueEmpty: (
      value: null | string | undefined | Record<string, unknown> | Date
    ) => boolean;
    isValidDate: (date: Date | string) => boolean;
    mergeFHIRDataIntoLForms: (
      resourceType: Resource['resourceType'],
      resource: Resource,
      lform: LFormType,
      fhirVersion: string
    ) => LFormType;
    pruneNulls: (collectionObj: Record<string, unknown>) => Record<string, unknown>;
    removeObjectsFromArray: (
      targetObjects: Record<string, unknown>[],
      key: string,
      matchingValue: unknown,
      starting_index: number,
      all?: boolean
    ) => Record<string, unknown> | Record<string, unknown>[];
    setFHIRContext: (fhirContext: Client) => void;
    showWarning: (msg: string, item?: LFormType | LFormType['items']) => void;
    stringToDate: (strDate: string, looseParsing?: boolean) => unknown;
    stringToDTDateISO: (isoDateString: string) => Date;
    validateFHIRVersion: (version: string) => string;
  };
  HL7: unknown;
  Validations: unknown;
  LFormsData: unknown;
  _elementResizeDetectorMaker: unknown;
  Def: unknown;
  ucumPkg: unknown;
  FHIR: unknown;
};
