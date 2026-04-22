<template>
  <div class="api-documentation-page">
    <ApiDocumentationHeader
      :downloading="downloading"
      :download-full-documentation="downloadFullDocumentation"
      :refresh-documentation="refreshDocumentation"
    />

    <div class="doc-container">
      <div class="doc-main">
        <div class="markdown-body">
          <ApiDocumentationIntroSection :api-base-url="apiBaseUrl" />
          <ApiDocumentationQuickstartSection
            :auth-header-example="authHeaderExample"
            :copy-text="copyText"
            :quick-start-curl="quickStartCurl"
          />
          <ApiDocumentationPermissionsSection
            :icon-map="iconMap"
            :permission-rows="permissionRows"
            :resource-types="resourceTypes"
          />
          <ApiDocumentationEndpointsSection :endpoint-groups="endpointGroups" />
          <ApiDocumentationExamplesSection
            :copy-text="copyText"
            :request-examples="requestExamples"
          />
          <ApiDocumentationNotesSection :error-codes="errorCodes" :notes="notes" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import './ApiDocumentation.css';
import { useApiDocumentationPage } from './apiDocumentationPageHelpers';
import ApiDocumentationEndpointsSection from './apiDocumentationSections/ApiDocumentationEndpointsSection.vue';
import ApiDocumentationExamplesSection from './apiDocumentationSections/ApiDocumentationExamplesSection.vue';
import ApiDocumentationHeader from './apiDocumentationSections/ApiDocumentationHeader.vue';
import ApiDocumentationIntroSection from './apiDocumentationSections/ApiDocumentationIntroSection.vue';
import ApiDocumentationNotesSection from './apiDocumentationSections/ApiDocumentationNotesSection.vue';
import ApiDocumentationPermissionsSection from './apiDocumentationSections/ApiDocumentationPermissionsSection.vue';
import ApiDocumentationQuickstartSection from './apiDocumentationSections/ApiDocumentationQuickstartSection.vue';

const {
  apiBaseUrl,
  authHeaderExample,
  copyText,
  downloading,
  downloadFullDocumentation,
  endpointGroups,
  errorCodes,
  iconMap,
  notes,
  permissionRows,
  quickStartCurl,
  refreshDocumentation,
  requestExamples,
  resourceTypes,
} = useApiDocumentationPage({
  ElMessage,
});
</script>
