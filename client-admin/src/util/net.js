// Copyright (C) 2012-present, The Authors. This program is free software: you can redistribute it and/or  modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

import URLs from './url'
import isString from 'lodash/isString'

const urlPrefix = URLs.urlPrefix
const basePath = ''

function polisAjax(api, data, type, additionalConfig = {}) {
  if (!isString(api)) {
    throw new Error('api param should be a string')
  }

  if (api && api.length && api[0] === '/') {
    api = api.slice(1)
  }

  const url = urlPrefix + basePath + api

  const config = {
    url,
    contentType: 'application/json; charset=utf-8',
    headers: {
      'Cache-Control': 'max-age=0'
    },
    xhrFields: {
      withCredentials: true
    },
    dataType: 'json',
    ...additionalConfig
  }

  console.log('polisAjax', config)

  let promise
  if (type === 'GET') {
    promise = $.ajax(
      $.extend(config, {
        type: 'GET',
        data
      })
    )
  } else if (type === 'POST') {
    promise = $.ajax(
      $.extend(config, {
        type: 'POST',
        data: JSON.stringify(data)
      })
    )
  } else if (type === 'PUT') {
    promise = $.ajax(
      $.extend(config, {
        type: 'PUT',
        data: JSON.stringify(data)
      })
    )
  }

  promise.fail(function (jqXHR /*, message, errorType*/) {
    console.dir('polisAjax promise failed: ', arguments)
    if (jqXHR.status === 403) {
      // eb.trigger(eb.authNeeded);
    }
  })
  return promise
}

function polisPost(api, data, additionalConfig) {
  return polisAjax(api, data, 'POST', additionalConfig)
}

function polisGet(api, data, additionalConfig) {
  return polisAjax(api, data, 'GET', additionalConfig)
}

function polisPut(api, data, additionalConfig) {
  return polisAjax(api, data, 'PUT', additionalConfig)
}

const PolisNet = {
  polisAjax,
  polisPost,
  polisGet,
  polisPut
}
export default PolisNet
